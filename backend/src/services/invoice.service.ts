import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';

export class InvoiceService {
  /**
   * Generates and streams a professional PDF tax invoice for an order
   */
  static async generateOrderInvoice(
    orderId: string,
    userId: string,
    userRole: Role,
    res: Response
  ): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        address: true,
        items: {
          include: {
            product: { select: { name: true, slug: true } },
            vendor: { select: { storeName: true } },
          },
        },
        couponUsages: {
          include: { coupon: { select: { code: true } } },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    // ACCEPTANCE CRITERIA: Invoice URLs and access are protected.
    // Must be customer who placed it, admin, or vendor of an item
    const isOwner = order.customerId === userId;
    const isAdmin = userRole === Role.ADMIN;
    const isVendorOfItem = order.items.some((i) => i.vendorId === userId); // or vendor profile ID

    if (!isOwner && !isAdmin && !isVendorOfItem) {
      throw new AppError('Unauthorized: You do not have permission to access this invoice.', 403, 'FORBIDDEN');
    }

    // Set response headers for PDF streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="UrbanBasket-Invoice-${order.id.slice(0, 8)}.pdf"`
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Pipe PDF directly to response
    doc.pipe(res);

    // 1. Header & Branding
    doc
      .fontSize(22)
      .fillColor('#059669') // Emerald green
      .text('UrbanBasket', 40, 40)
      .fontSize(10)
      .fillColor('#64748b')
      .text('Multi-Vendor Marketplace Platform', 40, 68);

    doc
      .fontSize(16)
      .fillColor('#0f172a')
      .text('TAX INVOICE', 380, 40, { align: 'right' })
      .fontSize(9)
      .fillColor('#475569')
      .text(`Invoice ID: UB-${order.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`, 380, 60, { align: 'right' })
      .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 380, 74, { align: 'right' })
      .text(`Order Status: ${order.status}`, 380, 88, { align: 'right' });

    doc.moveTo(40, 110).lineTo(555, 110).strokeColor('#e2e8f0').stroke();

    // 2. Billing & Shipping Address
    let currentY = 125;
    doc
      .fontSize(11)
      .fillColor('#0f172a')
      .text('Billed & Delivered To:', 40, currentY);

    doc
      .fontSize(10)
      .fillColor('#334155')
      .text(order.customer.name, 40, currentY + 16)
      .text(order.customer.email, 40, currentY + 30);

    if (order.address) {
      doc
        .text(`${order.address.line1}${order.address.line2 ? ', ' + order.address.line2 : ''}`, 40, currentY + 44)
        .text(`${order.address.city}, ${order.address.state} - ${order.address.postalCode}`, 40, currentY + 58)
        .text(`Phone: ${order.address.phone}`, 40, currentY + 72);
      currentY += 88;
    } else {
      currentY += 50;
    }

    // 3. Payment Details Bar
    doc
      .rect(40, currentY, 515, 30)
      .fillColor('#f8fafc')
      .fill()
      .strokeColor('#e2e8f0')
      .stroke();

    doc
      .fontSize(9)
      .fillColor('#475569')
      .text(
        `Payment Provider: ${(order.paymentProvider || 'Stripe').toUpperCase()}   |   Status: ${order.paymentStatus}   |   Ref: ${order.paymentReference || 'N/A'}`,
        50,
        currentY + 10
      );

    currentY += 45;

    // 4. Line Items Table Header
    doc
      .rect(40, currentY, 515, 24)
      .fillColor('#f1f5f9')
      .fill();

    doc
      .fontSize(9)
      .fillColor('#0f172a')
      .text('Item Description', 50, currentY + 7)
      .text('Merchant', 250, currentY + 7)
      .text('Qty', 370, currentY + 7, { align: 'center', width: 40 })
      .text('Unit Price', 420, currentY + 7, { align: 'right', width: 60 })
      .text('Subtotal', 485, currentY + 7, { align: 'right', width: 60 });

    currentY += 24;

    // 5. Line Items Rows
    doc.fillColor('#334155').fontSize(9);
    for (const item of order.items) {
      const itemSubtotal = Number(item.subtotal).toFixed(2);
      const unitPrice = Number(item.unitPrice).toFixed(2);

      doc
        .text(item.product.name, 50, currentY + 6, { width: 190 })
        .text(item.vendor.storeName, 250, currentY + 6, { width: 110 })
        .text(item.quantity.toString(), 370, currentY + 6, { align: 'center', width: 40 })
        .text(`$${unitPrice}`, 420, currentY + 6, { align: 'right', width: 60 })
        .text(`$${itemSubtotal}`, 485, currentY + 6, { align: 'right', width: 60 });

      currentY += 22;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#f1f5f9').stroke();
    }

    currentY += 15;

    // 6. Summary Totals Box
    const totalsX = 350;
    doc
      .fontSize(9)
      .fillColor('#64748b')
      .text('Subtotal:', totalsX, currentY)
      .fillColor('#0f172a')
      .text(`$${Number(order.subtotal).toFixed(2)}`, 485, currentY, { align: 'right', width: 60 });

    currentY += 16;

    if (Number(order.discount) > 0) {
      const couponCode = order.couponUsages[0]?.coupon?.code || 'COUPON';
      doc
        .fillColor('#059669')
        .text(`Discount (${couponCode}):`, totalsX, currentY)
        .text(`-$${Number(order.discount).toFixed(2)}`, 485, currentY, { align: 'right', width: 60 });
      currentY += 16;
    }

    doc.moveTo(totalsX, currentY).lineTo(555, currentY).strokeColor('#cbd5e1').stroke();
    currentY += 6;

    doc
      .fontSize(12)
      .fillColor('#0f172a')
      .text('Total Paid:', totalsX, currentY)
      .text(`$${Number(order.total).toFixed(2)}`, 485, currentY, { align: 'right', width: 60 });

    // 7. Footer
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        'Thank you for shopping on UrbanBasket. This computer-generated tax invoice confirms order settlement and merchant dispatch.',
        40,
        740,
        { align: 'center', width: 515 }
      );

    doc.end();
  }
}
