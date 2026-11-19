import { Router } from 'express';
import {
  getMyOrders,
  getOrderById,
  cancelOrder,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Customer order routes
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);

export default router;
