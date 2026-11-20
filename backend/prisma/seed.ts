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
  Prisma,
} from '@prisma/client';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Starting comprehensive database seed for UrbanBasket...');

  // 1. Clean existing product/order/review records safely
  await prisma.orderStatusHistory.deleteMany();
  await prisma.vendorPayout.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();

  // Delete addresses of non-google users
  await prisma.address.deleteMany({
    where: {
      user: {
        email: { not: 'deepakrrana7@gmail.com' },
      },
    },
  });

  // Delete vendor profiles and non-Google profiles
  await prisma.vendorProfile.deleteMany();
  await prisma.profile.deleteMany({
    where: {
      email: { not: 'deepakrrana7@gmail.com' },
    },
  });

  console.log('🧹 Cleaned existing records (preserved active user profile)');

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

  const vendor3Profile = await prisma.profile.create({
    data: {
      supabaseUserId: 'supa-vendor-003',
      name: 'David Craft (Artisan Woodcraft)',
      email: 'artisan@urbanbasket.com',
      role: Role.VENDOR,
    },
  });

  const vendor4Profile = await prisma.profile.create({
    data: {
      supabaseUserId: 'supa-vendor-004',
      name: 'Astrid Lindholm (Nordic Atelier)',
      email: 'nordic@urbanbasket.com',
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

  console.log('✅ Created User Profiles (Admin, 4 Vendors, 1 Customer)');

  // 3. Vendor Profiles
  const techNestVendor = await prisma.vendorProfile.create({
    data: {
      userId: vendor1Profile.id,
      storeName: 'TechNest Electronics',
      storeSlug: 'technest-electronics',
      description: 'Acoustic audio gear, ergonomic peripherals, and precision everyday tech.',
      status: VendorStatus.APPROVED,
      commissionRate: new Prisma.Decimal(0.10),
    },
  });

  const greenLivingVendor = await prisma.vendorProfile.create({
    data: {
      userId: vendor2Profile.id,
      storeName: 'GreenLiving Organics',
      storeSlug: 'greenliving-organics',
      description: 'Sustainably sourced, zero-waste, and handcrafted daily lifestyle essentials.',
      status: VendorStatus.APPROVED,
      commissionRate: new Prisma.Decimal(0.08),
    },
  });

  const artisanVendor = await prisma.vendorProfile.create({
    data: {
      userId: vendor3Profile.id,
      storeName: 'Artisan Woodcraft & Co',
      storeSlug: 'artisan-woodcraft',
      description: 'Handmade reclaimed wood kitchenware, bespoke stoneware, and culinary tools.',
      status: VendorStatus.APPROVED,
      commissionRate: new Prisma.Decimal(0.10),
    },
  });

  const nordicVendor = await prisma.vendorProfile.create({
    data: {
      userId: vendor4Profile.id,
      storeName: 'Nordic Living Atelier',
      storeSlug: 'nordic-living-atelier',
      description: 'Scandinavian minimalist homeware, pure linen textiles, and timeless goods.',
      status: VendorStatus.APPROVED,
      commissionRate: new Prisma.Decimal(0.10),
    },
  });

  console.log('✅ Created 4 Approved Vendor Stores');

  // 4. Categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: 'Electronics & Audio', slug: 'electronics-audio' },
    }),
    prisma.category.create({
      data: { name: 'Home & Living', slug: 'home-living' },
    }),
    prisma.category.create({
      data: { name: 'Kitchen & Dining', slug: 'kitchen-dining' },
    }),
    prisma.category.create({
      data: { name: 'Eco Lifestyle', slug: 'eco-lifestyle' },
    }),
    prisma.category.create({
      data: { name: 'Wearables & Goods', slug: 'wearables-goods' },
    }),
  ]);

  const [catAudio, catHome, catKitchen, catEco, catWearables] = categories;
  console.log('✅ Created 5 Product Categories');

  // 5. Rich Products (24 Items)
  const productData = [
    // Electronics & Audio (TechNest)
    {
      vendorId: techNestVendor.id,
      categoryId: catAudio.id,
      name: 'Wireless ANC Over-Ear Headphones',
      slug: 'wireless-anc-over-ear-headphones',
      description: 'High-fidelity audio with hybrid active noise cancellation, 40-hour battery life, and memory-foam ear cushions. Premium matte anodized finish with lossless Bluetooth 5.3 codecs.',
      price: 179.99,
      stock: 45,
      rating: 4.9,
      reviewCount: 142,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      alt: 'Wireless ANC Over-Ear Headphones in Matte Black',
    },
    {
      vendorId: techNestVendor.id,
      categoryId: catAudio.id,
      name: 'Custom Mechanical RGB Keyboard',
      slug: 'custom-mechanical-rgb-keyboard',
      description: 'Hot-swappable tactile switches with aircraft-grade aluminum top frame, sound-dampening silicone gaskets, and per-key customizable warm amber-to-RGB backlighting.',
      price: 119.50,
      stock: 32,
      rating: 4.8,
      reviewCount: 86,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
      alt: 'Mechanical keyboard with warm RGB backlighting',
    },
    {
      vendorId: techNestVendor.id,
      categoryId: catAudio.id,
      name: 'Studio Hi-Fi Desktop Speakers',
      slug: 'studio-hi-fi-desktop-speakers',
      description: 'Reference-grade active bookshelf monitors with solid American walnut enclosure, Kevlar cone woofers, and silk dome tweeters for pristine nearfield acoustic reproduction.',
      price: 229.00,
      stock: 18,
      rating: 4.9,
      reviewCount: 54,
      imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
      alt: 'Pair of walnut wood bookshelf monitors on studio desk',
    },
    {
      vendorId: techNestVendor.id,
      categoryId: catWearables.id,
      name: 'AeroTrack Pro Fitness Smartwatch',
      slug: 'aerotrack-pro-smartwatch',
      description: 'Continuous SpO2 and optical heart rate tracking, built-in dual-band GPS, sapphire crystal glass, AMOLED retina display with 5ATM water resistance and 14-day battery life.',
      price: 149.00,
      stock: 58,
      rating: 4.7,
      reviewCount: 98,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      alt: 'AeroTrack Pro Smartwatch on minimal display stand',
    },
    {
      vendorId: techNestVendor.id,
      categoryId: catAudio.id,
      name: 'Precision Aluminum Wireless Mouse',
      slug: 'precision-aluminum-wireless-mouse',
      description: 'CNC-machined anodized aluminum unibody with magnetic frictionless scroll wheel, silent tactile switches, and USB-C fast charging lasting up to 90 days per charge.',
      price: 64.00,
      stock: 75,
      rating: 4.6,
      reviewCount: 42,
      imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80',
      alt: 'Ergonomic aluminum wireless desk mouse',
    },
    {
      vendorId: techNestVendor.id,
      categoryId: catAudio.id,
      name: 'MagCharge 3-in-1 Wireless Stand',
      slug: 'magcharge-3-in-1-wireless-stand',
      description: 'Simultaneously fast-charges phone, earbuds, and smartwatch on a weighted space gray aluminum pedestal with integrated thermal heat dissipation.',
      price: 79.00,
      stock: 40,
      rating: 4.8,
      reviewCount: 115,
      imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&q=80',
      alt: 'MagCharge 3-in-1 wireless stand charging devices',
    },

    // Home & Living (Nordic Living Atelier)
    {
      vendorId: nordicVendor.id,
      categoryId: catHome.id,
      name: 'Handmade Stoneware Ceramic Mug Set',
      slug: 'handmade-stoneware-ceramic-mug-set',
      description: 'Set of 4 artisan coffee mugs thrown on a traditional potter wheel with natural volcanic speckling and soft-touch satin glaze. Microwave and dishwasher safe.',
      price: 48.00,
      stock: 65,
      rating: 4.9,
      reviewCount: 73,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
      alt: 'Set of ceramic mugs with warm artisan coffee',
    },
    {
      vendorId: nordicVendor.id,
      categoryId: catKitchen.id,
      name: 'Japanese Cast Iron Teapot & Infuser',
      slug: 'japanese-cast-iron-teapot-800ml',
      description: 'Traditional Tetsubin-inspired cast iron kettle with porcelain enamel interior, removable fine-mesh stainless steel infuser, and exceptional heat retention.',
      price: 68.00,
      stock: 28,
      rating: 5.0,
      reviewCount: 39,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80',
      alt: 'Textured black cast iron teapot on wooden trivet',
    },
    {
      vendorId: nordicVendor.id,
      categoryId: catHome.id,
      name: 'Woven Organic French Linen Throw',
      slug: 'woven-organic-french-linen-throw',
      description: 'Woven from 100% certified Normandy flax linen, pre-washed for vintage softness and relaxed drape. Breathable year-round comfort with subtle fringed edges.',
      price: 85.00,
      stock: 35,
      rating: 4.8,
      reviewCount: 61,
      imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80',
      alt: 'Soft textured oatmeal linen throw blanket folded',
    },
    {
      vendorId: nordicVendor.id,
      categoryId: catHome.id,
      name: 'Nordic Minimalist Oak Wall Clock',
      slug: 'nordic-minimalist-oak-wall-clock',
      description: 'Crafted from solid sustainably harvested European white oak with flush laser-etched hour markers and a whisper-silent German quartz sweeping movement.',
      price: 55.00,
      stock: 22,
      rating: 4.7,
      reviewCount: 28,
      imageUrl: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&q=80',
      alt: 'Clean wooden wall clock hanging on textured white wall',
    },
    {
      vendorId: nordicVendor.id,
      categoryId: catHome.id,
      name: 'Hand-Poured Amber Glass Soy Candle',
      slug: 'hand-poured-amber-glass-soy-candle',
      description: '100% botanical soy wax scented with organic cedarwood, dark vanilla, black tea, and smoked amber. Poured in an apothecary amber jar with unbleached cotton wick.',
      price: 28.00,
      stock: 110,
      rating: 4.9,
      reviewCount: 110,
      imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&q=80',
      alt: 'Amber glass candle burning with gentle flame',
    },
    {
      vendorId: nordicVendor.id,
      categoryId: catHome.id,
      name: 'Minimalist Terrazzo Desk Tray',
      slug: 'minimalist-terrazzo-desk-tray',
      description: 'Hand-cast terrazzo catchall tray with natural marble stone chips and polished water-resistant sealant. Non-slip cork base preserves tabletop surfaces.',
      price: 34.00,
      stock: 50,
      rating: 4.6,
      reviewCount: 35,
      imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
      alt: 'Terrazzo valet tray holding everyday carry items',
    },

    // Kitchen & Dining (Artisan Woodcraft & Co)
    {
      vendorId: artisanVendor.id,
      categoryId: catKitchen.id,
      name: 'Natural Bamboo Cutlery & Utensils Set',
      slug: 'natural-bamboo-cutlery-set',
      description: 'Handcrafted non-toxic bamboo spoons, forks, knives, chopsticks, and reusable straw packaged with an organic washable linen roll-up carry pouch.',
      price: 24.00,
      stock: 85,
      rating: 4.7,
      reviewCount: 88,
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
      alt: 'Natural bamboo cutlery set laid out with linen pouch',
    },
    {
      vendorId: artisanVendor.id,
      categoryId: catKitchen.id,
      name: 'Damascus Steel Chef Knife 8-Inch',
      slug: 'damascus-steel-chef-knife-8-inch',
      description: 'Forged from 67 layers of Japanese VG-10 high-carbon super steel with 60±2 HRC rockwell hardness. Ergonomic rounded Pakkawood handle for effortless slicing.',
      price: 135.00,
      stock: 20,
      rating: 5.0,
      reviewCount: 94,
      imageUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&q=80',
      alt: 'Damascus steel chef knife resting on dark butcher block',
    },
    {
      vendorId: artisanVendor.id,
      categoryId: catKitchen.id,
      name: 'Pour-Over Borosilicate Coffee Dripper',
      slug: 'pour-over-borosilicate-coffee-dripper',
      description: 'Thermal-shock resistant borosilicate glass carafe with laser-cut dual mesh stainless steel filter eliminating paper waste while extracting rich coffee crema.',
      price: 42.00,
      stock: 45,
      rating: 4.8,
      reviewCount: 67,
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&q=80',
      alt: 'Glass pour-over coffee dripper brewing fresh coffee',
    },
    {
      vendorId: artisanVendor.id,
      categoryId: catKitchen.id,
      name: 'Raw Edge Acacia Wood Serving Board',
      slug: 'raw-edge-acacia-wood-serving-board',
      description: 'Single piece solid acacia hardwood board with organic natural live edges and brass hanging hole. Treated with food-safe botanical oils and beeswax.',
      price: 52.00,
      stock: 30,
      rating: 4.9,
      reviewCount: 45,
      imageUrl: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80',
      alt: 'Dark acacia wood charcuterie board with artisan bread',
    },
    {
      vendorId: artisanVendor.id,
      categoryId: catKitchen.id,
      name: 'Ceramic Salt & Pepper Mill Grinder Set',
      slug: 'ceramic-salt-pepper-mill-grinder-set',
      description: 'Adjustable ceramic burr grinding mechanism encased in smooth natural beechwood body with stainless steel crown adjustment from coarse cracked pepper to fine dust.',
      price: 46.00,
      stock: 55,
      rating: 4.8,
      reviewCount: 52,
      imageUrl: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=800&q=80',
      alt: 'Pair of wooden spice and salt grinder mills',
    },

    // Eco Lifestyle (GreenLiving Organics)
    {
      vendorId: greenLivingVendor.id,
      categoryId: catEco.id,
      name: 'Organic Virgin Coconut Oil 1L',
      slug: 'organic-virgin-coconut-oil-1l',
      description: '100% pure raw unrefined cold-pressed coconut oil extracted from wild harvested coastal coconuts. Unbleached, unhydrogenated, and bottled in UV-protective amber glass.',
      price: 18.50,
      stock: 140,
      rating: 4.9,
      reviewCount: 164,
      imageUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&q=80',
      alt: 'Glass jar of organic cold-pressed coconut oil',
    },
    {
      vendorId: greenLivingVendor.id,
      categoryId: catEco.id,
      name: 'Reusable Beeswax Food Wraps (3-Pack)',
      slug: 'reusable-beeswax-food-wraps-3-pack',
      description: 'Biodegradable alternative to plastic cling wrap. Infused with organic beeswax, jojoba oil, and natural tree resin on GOTS certified organic printed cotton.',
      price: 19.99,
      stock: 95,
      rating: 4.7,
      reviewCount: 83,
      imageUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&q=80',
      alt: 'Set of patterned beeswax wraps wrapping fresh sourdough',
    },
    {
      vendorId: greenLivingVendor.id,
      categoryId: catEco.id,
      name: 'Stainless Steel Insulated Tumbler 750ml',
      slug: 'stainless-steel-insulated-tumbler-750ml',
      description: 'Double-walled vacuum insulated 18/8 food-grade stainless steel bottle. Keeps drinks icy cold for 24 hours or piping hot for 12 hours with condensation-free powder coat.',
      price: 32.00,
      stock: 80,
      rating: 4.8,
      reviewCount: 127,
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80',
      alt: 'Matte sage green stainless steel travel bottle',
    },
    {
      vendorId: greenLivingVendor.id,
      categoryId: catEco.id,
      name: 'Heavyweight Organic Canvas Tote Bag',
      slug: 'heavyweight-organic-canvas-tote-bag',
      description: 'Crafted from durable 16oz fair-trade certified organic cotton canvas with reinforced box-stitched handles, interior zipped security pocket, and key leash clip.',
      price: 38.00,
      stock: 60,
      rating: 4.6,
      reviewCount: 49,
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80',
      alt: 'Natural cream heavy canvas tote bag styled outdoors',
    },

    // Wearables & Goods (Nordic & TechNest)
    {
      vendorId: nordicVendor.id,
      categoryId: catWearables.id,
      name: 'Merino Wool Minimalist Beanie',
      slug: 'merino-wool-minimalist-beanie',
      description: 'Spun from 100% non-mulesed Australian extrafine merino wool in a snug 7-gauge ribbed knit. Naturally thermoregulating, odor-resistant, and itch-free.',
      price: 36.00,
      stock: 70,
      rating: 4.9,
      reviewCount: 71,
      imageUrl: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80',
      alt: 'Charcoal grey merino wool ribbed knit beanie',
    },
    {
      vendorId: artisanVendor.id,
      categoryId: catWearables.id,
      name: 'Full-Grain Vegetable Tanned Cardholder',
      slug: 'full-grain-leather-cardholder',
      description: 'Handmade from Tuscan vegetable-tanned full-grain cowhide leather with hand-waxed saddle stitching and beveled beeswax-burnished edges. Develops rich natural patina.',
      price: 45.00,
      stock: 50,
      rating: 4.9,
      reviewCount: 93,
      imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',
      alt: 'Whiskey brown full-grain leather pocket cardholder',
    },
    {
      vendorId: nordicVendor.id,
      categoryId: catWearables.id,
      name: 'Polarized Acetate Classic Sunglasses',
      slug: 'polarized-acetate-classic-sunglasses',
      description: 'Hand-finished Italian Mazzucchelli bio-acetate frames featuring 5-barrel custom German hinges and scratch-resistant polarized CR-39 lenses with 100% UVA/UVB protection.',
      price: 95.00,
      stock: 35,
      rating: 4.7,
      reviewCount: 58,
      imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
      alt: 'Dark tortoiseshell polarized sunglasses on clean marble surface',
    },
  ];

  console.log(`📦 Seeding ${productData.length} published products...`);

  for (const item of productData) {
    await prisma.product.create({
      data: {
        vendorId: item.vendorId,
        categoryId: item.categoryId,
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: new Prisma.Decimal(item.price),
        stock: item.stock,
        status: ProductStatus.PUBLISHED,
        averageRating: new Prisma.Decimal(item.rating),
        reviewCount: item.reviewCount,
        images: {
          create: [
            {
              storagePath: `products/${item.slug}.jpg`,
              publicUrl: item.imageUrl,
              position: 0,
              altText: item.alt,
            },
          ],
        },
      },
    });
  }

  console.log(`✅ Created ${productData.length} Products with rich images and metadata`);

  // 6. Promotional Coupons
  await prisma.coupon.create({
    data: {
      code: 'WELCOME10',
      type: CouponType.PERCENTAGE,
      value: new Prisma.Decimal(10.00),
      minimumAmount: new Prisma.Decimal(50.00),
      maximumDiscount: new Prisma.Decimal(30.00),
      usageLimit: 500,
      usedCount: 0,
      startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'SAVE20',
      type: CouponType.PERCENTAGE,
      value: new Prisma.Decimal(20.00),
      minimumAmount: new Prisma.Decimal(120.00),
      maximumDiscount: new Prisma.Decimal(50.00),
      usageLimit: 300,
      usedCount: 0,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'FLAT25',
      type: CouponType.FIXED,
      value: new Prisma.Decimal(25.00),
      minimumAmount: new Prisma.Decimal(100.00),
      usageLimit: 200,
      usedCount: 0,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  console.log('✅ Created 3 Promotional Coupons (WELCOME10, SAVE20, FLAT25)');
  console.log('🎉 UrbanBasket database seed successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
