import { Router } from 'express';
import {
  createPaymentIntent,
  handleWebhook,
  verifyTestPayment,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Create payment session / intent for an order
router.post('/create-intent', authenticate, createPaymentIntent);

// Test verification endpoint for demo checkout
router.post('/verify', authenticate, verifyTestPayment);

// Webhook endpoint (signed webhook)
router.post('/webhook', handleWebhook);

export default router;
