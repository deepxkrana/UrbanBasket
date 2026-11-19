import { Router } from 'express';
import { checkout } from '../controllers/checkout.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Checkout operations require authentication
router.use(authenticate);
router.post('/', checkout);

export default router;
