import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import vendorRoutes from './vendor.routes';
import adminRoutes from './admin.routes';
import categoryRoutes from './category.routes';

const router = Router();

// Root health check mounted at /api/health
router.use('/', healthRoutes);

// V1 API Router
const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/categories', categoryRoutes);
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
