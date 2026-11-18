import {
  PrismaClient,
  Role,
  VendorStatus,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  ReviewStatus,
  CouponType,
  PayoutStatus,
  Prisma,
} from '@prisma/client';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Starting database seed for UrbanBasket...');

  // 1. Clean existing records in reverse dependency order to ensure idempotency
  await prisma.orderStatusHistory.deleteMany();
  await prisma.vendorPayout.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.profile.deleteMany();

  console.log('🧹 Cleaned existing database records');

  // 2. Demo Profiles
  const adminProfile = await prisma.profile.create({
    data: {
      supabaseUserId: 'supa-admin-001',
      name: 'Super Admin',
      email: 'admin@urbanbasket.com',
      role: Role.ADMIN,
    },
  });

  const vendor1Profile = await prisma.profile.create({
    data: {
      supabaseUserId: 'supa-vendor-001',
      name: 'Alex Rivera (TechNest)',
      email: 'technest@urbanbasket.com',
      role: Role.VENDOR,
    },
  });

  const vendor2Profile = await prisma.profile.create({
    data: {
      supabaseUserId: 'supa-vendor-002',
      name: 'Maya Sharma (GreenLiving)',
      email: 'greenliving@urbanbasket.com',
      role: Role.VENDOR,
    },
  });

  const pendingVendorProfile = await prisma.profile.create({
    data: {
      supabaseUserId: 'supa-vendor-003',
      name: 'David Craft (ArtisanGoods)',
      email: 'artisan@urbanbasket.com',
      role: Role.VENDOR,
    },
  });

  const customerProfile = await prisma.profile.create({
    data: {
      supabaseUserId: 'supa-customer-001',
      name: 'Priya Patel',
      email: 'customer@urbanbasket.com',
      role: Role.CUSTOMER,
    },
  });

  console.log('✅ Created 5 User Profiles (Admin, 2 Approved Vendors, 1 Pending Vendor, 1 Customer)');

  // 3. Vendor Profiles
  const techNestVendor = await prisma.vendorProfile.create({
    data: {
      userId: vendor1Profile.id,
      storeName: 'TechNest Electronics',
      storeSlug: 'technest-electronics',
      description: 'Cutting-edge consumer electronics, accessories, and smart devices.',
      status: VendorStatus.APPROVED,
      commissionRate: new Prisma.Decimal(0.10), // 10% platform fee
    },
  });

  const greenLivingVendor = await prisma.vendorProfile.create({
    data: {
      userId: vendor2Profile.id,
      storeName: 'GreenLiving Organics',
      storeSlug: 'greenliving-organics',
      description: 'Sustainably sourced, zero-waste, and handcrafted daily lifestyle essentials.',
      status: VendorStatus.APPROVED,
      commissionRate: new Prisma.Decimal(0.08), // 8% platform fee
    },
  });

  await prisma.vendorProfile.create({
    data: {
      userId: pendingVendorProfile.id,
      storeName: 'Artisan Woodcraft & Co',
      storeSlug: 'artisan-woodcraft',
      description: 'Handmade reclaimed wood kitchenware and home decor.',
      status: VendorStatus.PENDING,
      commissionRate: new Prisma.Decimal(0.12),
    },
  });

  console.log('✅ Created 3 Vendor Stores');

  // 4. Categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: 'Electronics & Audio', slug: 'electronics-audio' },
    }),
    prisma.category.create({
      data: { name: 'Home & Kitchen', slug: 'home-kitchen' },
    }),
    prisma.category.create({
      data: { name: 'Eco Lifestyle', slug: 'eco-lifestyle' },
    }),
    prisma.category.create({
      data: { name: 'Wearables & Fitness', slug: 'wearables-fitness' },
    }),
  ]);

  const [catElectronics, catHome, catEco, catWearables] = categories;
  console.log('✅ Created 4 Product Categories');

  // 5. Products & Product Images
  const p1 = await prisma.product.create({
    data: {
      vendorId: techNestVendor.id,
      categoryId: catElectronics.id,
      name: 'Wireless ANC Over-Ear Headphones',
      slug: 'wireless-anc-over-ear-headphones',
      description: 'High-fidelity audio with hybrid active noise cancellation, 40-hour battery life, and memory-foam ear cushions.',
      price: new Prisma.Decimal(179.99),
      stock: 45,
      status: ProductStatus.PUBLISHED,
      averageRating: new Prisma.Decimal(4.8),
      reviewCount: 1,
      images: {
        create: [
          {
            storagePath: 'products/headphones-1.jpg',
            publicUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
            position: 0,
            altText: 'TechNest Wireless ANC Headphones in Matte Black',
          },
          {
            storagePath: 'products/headphones-2.jpg',
            publicUrl: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80',
            position: 1,
            altText: 'Headphones side view on stand',
          },
        ],
      },
    },
  });

  const p2 = await prisma.product.create({
    data: {
      vendorId: techNestVendor.id,
      categoryId: catElectronics.id,
      name: 'Custom Mechanical RGB Keyboard',
      slug: 'custom-mechanical-rgb-keyboard',
      description: 'Hot-swappable tactile switches with aircraft-grade aluminum frame and per-key customizable RGB lighting.',
      price: new Prisma.Decimal(99.50),
      stock: 30,
      status: ProductStatus.PUBLISHED,
      averageRating: new Prisma.Decimal(5.0),
      reviewCount: 0,
      images: {
        create: [
          {
            storagePath: 'products/keyboard-1.jpg',
            publicUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
            position: 0,
            altText: 'Mechanical keyboard with warm RGB backlighting',
          },
        ],
      },
    },
  });

  const p3 = await prisma.product.create({
    data: {
      vendorId: techNestVendor.id,
      categoryId: catWearables.id,
      name: 'AeroTrack Pro Fitness Smartwatch',
      slug: 'aerotrack-pro-smartwatch',
      description: 'Continuous SpO2 and optical heart rate tracking, built-in dual-band GPS, AMOLED retina display with 5ATM water resistance.',
      price: new Prisma.Decimal(129.00),
      stock: 60,
      status: ProductStatus.PUBLISHED,
      averageRating: new Prisma.Decimal(4.5),
      reviewCount: 0,
      images: {
        create: [
          {
            storagePath: 'products/smartwatch-1.jpg',
            publicUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
            position: 0,
            altText: 'AeroTrack Pro Smartwatch on minimal display',
          },
        ],
      },
    },
  });

  const p4 = await prisma.product.create({
    data: {
      vendorId: greenLivingVendor.id,
      categoryId: catEco.id,
      name: 'Organic Cold-Pressed Virgin Coconut Oil 1L',
      slug: 'organic-virgin-coconut-oil-1l',
      description: '100% pure raw unrefined coconut oil extracted from freshly harvested Kerala coconuts. Food-grade and cruelty-free.',
      price: new Prisma.Decimal(16.50),
      stock: 120,
      status: ProductStatus.PUBLISHED,
      averageRating: new Prisma.Decimal(4.9),
      reviewCount: 1,
      images: {
        create: [
          {
            storagePath: 'products/coconut-oil-1.jpg',
            publicUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&q=80',
            position: 0,
            altText: 'Glass jar of cold-pressed organic coconut oil',
          },
        ],
      },
    },
  });

  const p5 = await prisma.product.create({
    data: {
      vendorId: greenLivingVendor.id,
      categoryId: catHome.id,
      name: 'Natural Bamboo Cutlery & Utensils Set',
      slug: 'natural-bamboo-cutlery-set',
      description: 'Handmade non-toxic bamboo spoons, forks, knives, and reusable straw with washable organic cotton carry pouch.',
      price: new Prisma.Decimal(22.00),
      stock: 75,
      status: ProductStatus.PUBLISHED,
      averageRating: new Prisma.Decimal(0.0),
      reviewCount: 0,
      images: {
        create: [
          {
            storagePath: 'products/bamboo-cutlery-1.jpg',
            publicUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
            position: 0,
            altText: 'Handcrafted natural bamboo utensils set',
          },
        ],
      },
    },
  });

  // Draft product example
  await prisma.product.create({
    data: {
      vendorId: techNestVendor.id,
      categoryId: catWearables.id,
      name: 'Next-Gen Holographic AR Glasses (Beta)',
      slug: 'holographic-ar-glasses-beta',
      description: 'Enterprise Augmented Reality wearable with spatial audio and micro-OLED optical waveguiding.',
      price: new Prisma.Decimal(599.00),
      stock: 5,
      status: ProductStatus.DRAFT,
      images: {
        create: [
          {
            storagePath: 'products/ar-glasses-1.jpg',
            publicUrl: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=800&q=80',
            position: 0,
            altText: 'Futuristic smart glasses prototype',
          },
        ],
      },
    },
  });

  console.log('✅ Created 6 Products across multiple categories with image galleries');

  // 6. Customer Address
  const customerAddress = await prisma.address.create({
    data: {
      userId: customerProfile.id,
      name: 'Priya Patel',
      phone: '+91 98765 43210',
      line1: 'Flat 402, Green Meadows Residences',
      line2: '14th Cross, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      country: 'India',
      isDefault: true,
    },
  });

  console.log('✅ Created Customer Address');

  // 7. Coupons
  const couponWelcome = await prisma.coupon.create({
    data: {
      code: 'WELCOME10',
      type: CouponType.PERCENTAGE,
      value: new Prisma.Decimal(10.00), // 10%
      minimumAmount: new Prisma.Decimal(50.00),
      maximumDiscount: new Prisma.Decimal(30.00),
      usageLimit: 500,
      usedCount: 1,
      startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'FLAT25',
      type: CouponType.FIXED,
      value: new Prisma.Decimal(25.00), // $25 off
      minimumAmount: new Prisma.Decimal(100.00),
      usageLimit: 200,
      usedCount: 0,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  console.log('✅ Created 2 Promotional Coupons (WELCOME10 & FLAT25)');

  // 8. Completed Multi-Vendor Sample Order
  // Item 1: Headphones from TechNest: 1 x 179.99 = 179.99
  // Item 2: Coconut Oil from GreenLiving: 2 x 16.50 = 33.00
  // Subtotal = 212.99
  // Discount (10% with WELCOME10) = 21.30
  // Total = 191.69
  // Commissions:
  // TechNest: 179.99 * 0.10 = 18.00 commission -> Vendor Payout = 161.99
  // GreenLiving: 33.00 * 0.08 = 2.64 commission -> Vendor Payout = 30.36
  // Total Platform Commission = 20.64

  const item1Subtotal = new Prisma.Decimal(179.99);
  const item1Commission = new Prisma.Decimal(18.00);
  const item1Payout = new Prisma.Decimal(161.99);

  const item2Subtotal = new Prisma.Decimal(33.00);
  const item2Commission = new Prisma.Decimal(2.64);
  const item2Payout = new Prisma.Decimal(30.36);

  const sampleOrder = await prisma.order.create({
    data: {
      customerId: customerProfile.id,
      addressId: customerAddress.id,
      status: OrderStatus.DELIVERED,
      subtotal: new Prisma.Decimal(212.99),
      discount: new Prisma.Decimal(21.30),
      total: new Prisma.Decimal(191.69),
      platformCommission: new Prisma.Decimal(20.64),
      paymentStatus: PaymentStatus.COMPLETED,
      paymentProvider: PaymentProvider.STRIPE,
      paymentReference: 'pi_test_3OubBasketSample01',
      invoiceUrl: '/api/v1/orders/sample-order/invoice',
      items: {
        create: [
          {
            productId: p1.id,
            vendorId: techNestVendor.id,
            quantity: 1,
            unitPrice: new Prisma.Decimal(179.99),
            subtotal: item1Subtotal,
            vendorPayout: item1Payout,
            status: OrderStatus.DELIVERED,
          },
          {
            productId: p4.id,
            vendorId: greenLivingVendor.id,
            quantity: 2,
            unitPrice: new Prisma.Decimal(16.50),
            subtotal: item2Subtotal,
            vendorPayout: item2Payout,
            status: OrderStatus.DELIVERED,
          },
        ],
      },
      payments: {
        create: {
          provider: PaymentProvider.STRIPE,
          providerPaymentId: 'ch_test_3OubBasketStripeCharge01',
          amount: new Prisma.Decimal(191.69),
          platformCommission: new Prisma.Decimal(20.64),
          status: PaymentStatus.COMPLETED,
        },
      },
      statusHistory: {
        create: [
          {
            status: OrderStatus.PLACED,
            changedBy: customerProfile.id,
            note: 'Order placed via Stripe checkout',
          },
          {
            status: OrderStatus.PACKED,
            changedBy: 'SYSTEM',
            note: 'Vendors confirmed item packing',
          },
          {
            status: OrderStatus.SHIPPED,
            changedBy: 'SYSTEM',
            note: 'Dispatched via express logistics',
          },
          {
            status: OrderStatus.DELIVERED,
            changedBy: 'SYSTEM',
            note: 'Delivered and verified by customer OTP',
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  // Record coupon usage
  await prisma.couponUsage.create({
    data: {
      couponId: couponWelcome.id,
      customerId: customerProfile.id,
      orderId: sampleOrder.id,
      discountAmount: new Prisma.Decimal(21.30),
    },
  });

  // Record vendor payouts
  const [orderItem1, orderItem2] = sampleOrder.items;

  await prisma.vendorPayout.create({
    data: {
      vendorId: techNestVendor.id,
      orderItemId: orderItem1.id,
      amount: item1Payout,
      status: PayoutStatus.PAID,
      providerPayoutId: 'tr_test_payout_technest_001',
    },
  });

  await prisma.vendorPayout.create({
    data: {
      vendorId: greenLivingVendor.id,
      orderItemId: orderItem2.id,
      amount: item2Payout,
      status: PayoutStatus.PAID,
      providerPayoutId: 'tr_test_payout_greenliving_001',
    },
  });

  // 9. Verified Review on delivered item
  await prisma.review.create({
    data: {
      customerId: customerProfile.id,
      productId: p1.id,
      orderItemId: orderItem1.id,
      rating: 5,
      comment: 'Superb sound clarity and the noise canceling is top notch for working in noisy cafes! Highly recommended.',
      status: ReviewStatus.APPROVED,
    },
  });

  await prisma.review.create({
    data: {
      customerId: customerProfile.id,
      productId: p4.id,
      orderItemId: orderItem2.id,
      rating: 5,
      comment: 'Authentic aroma and pure quality. Will definitely purchase again!',
      status: ReviewStatus.APPROVED,
    },
  });

  console.log('✅ Created Multi-Vendor Delivered Order with split payouts, coupon usage, and verified reviews');
  console.log('🎉 Seed complete! All demo roles and datasets are initialized.');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Seed execution failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
