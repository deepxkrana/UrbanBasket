import { Router } from 'express';
import {
  getProducts,
  getProductBySlug,
  getProductReviews,
} from '../controllers/catalog.controller';

const router = Router();

// Public catalog routes
router.get('/', getProducts);
router.get('/search', getProducts);
router.get('/:slug', getProductBySlug);
router.get('/:id/reviews', getProductReviews);

export default router;
