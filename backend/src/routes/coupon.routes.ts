import { Router } from 'express';
import { validateCoupon } from '../controllers/coupon.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validate coupon route (authenticated)
router.use(authenticate);
router.post('/validate', validateCoupon);

export default router;
