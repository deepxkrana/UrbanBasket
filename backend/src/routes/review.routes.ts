import { Router } from 'express';
import {
  createReview,
  getEligibleItemsForReview,
} from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All review creation and eligibility endpoints require authentication
router.use(authenticate);

router.post('/', createReview);
router.get('/eligible', getEligibleItemsForReview);

export default router;
