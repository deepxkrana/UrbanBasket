import { Router } from 'express';
import {
  getAdminVendors,
  updateVendorStatus,
  updateUserRole,
} from '../controllers/admin.controller';
import {
  getAdminReviews,
  moderateReview,
} from '../controllers/review.controller';
import {
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
} from '../controllers/adminCoupon.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// All admin routes strictly require authentication and ADMIN role
router.use(authenticate);
router.use(requireAdmin);

// Vendor governance
router.get('/vendors', getAdminVendors);
router.patch('/vendors/:id/status', updateVendorStatus);
router.patch('/users/:id/role', updateUserRole);

// Review moderation
router.get('/reviews', getAdminReviews);
router.patch('/reviews/:id/status', moderateReview);

// Coupon management
router.get('/coupons', getAdminCoupons);
router.post('/coupons', createAdminCoupon);
router.patch('/coupons/:id', updateAdminCoupon);
router.delete('/coupons/:id', deleteAdminCoupon);

export default router;
