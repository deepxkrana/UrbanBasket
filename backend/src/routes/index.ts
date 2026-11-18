import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Root health check mounted at /api/health
router.use('/', healthRoutes);

// V1 API Router
const v1Router = Router();

// Future Phase routes will be mounted here
v1Router.get('/', (_req, res) => {
  res.json({
    message: 'UrbanBasket API v1',
    status: 'active',
  });
});

router.use('/v1', v1Router);

export default router;
