import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import vendorRoutes from './vendor.routes';
import adminRoutes from './admin.routes';
import categoryRoutes from './category.routes';
import catalogRoutes from './catalog.routes';
import cartRoutes from './cart.routes';
import addressRoutes from './address.routes';
import couponRoutes from './coupon.routes';
import checkoutRoutes from './checkout.routes';
import paymentRoutes from './payment.routes';
import orderRoutes from './order.routes';

const router = Router();

// Root health check mounted at /api/health
router.use('/', healthRoutes);

// V1 API Router
const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/categories', categoryRoutes);
v1Router.use('/products', catalogRoutes);
v1Router.use('/cart', cartRoutes);
v1Router.use('/addresses', addressRoutes);
v1Router.use('/coupons', couponRoutes);
v1Router.use('/checkout', checkoutRoutes);
v1Router.use('/payments', paymentRoutes);
v1Router.use('/orders', orderRoutes);
v1Router.use('/vendors', vendorRoutes);
v1Router.use('/admin', adminRoutes);

v1Router.get('/', (_req, res) => {
  res.json({
    message: 'UrbanBasket API v1',
    status: 'active',
  });
});

router.use('/v1', v1Router);

export default router;
