import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/payment.service';
import { AppError } from '../middleware/errorHandler';
import { PaymentProvider } from '@prisma/client';

const createIntentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
});

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  providerPaymentId: z.string().optional(),
  status: z.enum(['COMPLETED', 'SUCCESS', 'FAILED']).default('COMPLETED'),
});

export const createPaymentIntent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { orderId } = createIntentSchema.parse(req.body);
    const result = await PaymentService.createPaymentIntent(orderId, req.user.id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stripeSignature = req.headers['stripe-signature'] as string | undefined;
    const razorpaySignature = req.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const isRazorpay = !!razorpaySignature;
    const signature = isRazorpay ? razorpaySignature : stripeSignature;
    const provider = isRazorpay ? PaymentProvider.RAZORPAY : PaymentProvider.STRIPE;

    // Verify webhook signature
    const isValid = PaymentService.verifyWebhookSignature(rawBody, signature, provider);
    if (!isValid) {
      throw new AppError('Invalid webhook signature.', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    const event = req.body;
    let orderId: string | undefined;
    let providerPaymentId: string | undefined;
    let status: 'COMPLETED' | 'FAILED' = 'COMPLETED';

    if (isRazorpay) {
      // Razorpay webhook payload format
      if (event.event === 'payment.captured' || event.event === 'order.paid') {
        const paymentEntity = event.payload?.payment?.entity;
        providerPaymentId = paymentEntity?.id || `rzp_${Date.now()}`;
        orderId = paymentEntity?.notes?.orderId;
        status = 'COMPLETED';
      } else if (event.event === 'payment.failed') {
        const paymentEntity = event.payload?.payment?.entity;
        providerPaymentId = paymentEntity?.id || `rzp_${Date.now()}`;
        orderId = paymentEntity?.notes?.orderId;
        status = 'FAILED';
      }
    } else {
      // Stripe webhook or test payload format
      const eventType = event.type || event.event;
      if (
        eventType === 'payment_intent.succeeded' ||
        eventType === 'charge.succeeded' ||
        eventType === 'checkout.session.completed'
      ) {
        const obj = event.data?.object || event.payload || event;
        providerPaymentId = obj.id || `pi_${Date.now()}`;
        orderId = obj.metadata?.orderId || obj.orderId;
        status = 'COMPLETED';
      } else if (
        eventType === 'payment_intent.payment_failed' ||
        eventType === 'charge.failed'
      ) {
        const obj = event.data?.object || event.payload || event;
        providerPaymentId = obj.id || `pi_failed_${Date.now()}`;
        orderId = obj.metadata?.orderId || obj.orderId;
        status = 'FAILED';
      } else if (event.orderId) {
        // Direct test webhook format
        orderId = event.orderId;
        providerPaymentId = event.providerPaymentId || `pi_test_${Date.now()}`;
        status = event.status === 'FAILED' ? 'FAILED' : 'COMPLETED';
      }
    }

    if (!orderId) {
      // Unrecognized event or missing orderId metadata, ack gracefully
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    const result = await PaymentService.processPaymentSettlement({
      orderId,
      provider,
      providerPaymentId: providerPaymentId || `pay_${Date.now()}`,
      status,
    });

    res.status(200).json({
      received: true,
      idempotent: result.idempotent,
      orderId: result.orderId,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify test / demo mode checkout directly from the frontend
 */
export const verifyTestPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { orderId, providerPaymentId, status } = verifyPaymentSchema.parse(req.body);

    const normalizedStatus: 'COMPLETED' | 'FAILED' = status === 'FAILED' ? 'FAILED' : 'COMPLETED';

    const result = await PaymentService.processPaymentSettlement(
      {
        orderId,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: providerPaymentId || `demo_pay_${Date.now()}`,
        status: normalizedStatus,
      },
      `USER_${req.user.id}`
    );

    res.status(200).json({
      success: true,
      message: result.idempotent
        ? 'Payment was already confirmed.'
        : normalizedStatus === 'COMPLETED'
          ? 'Payment processed successfully.'
          : 'Payment failed as requested.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
