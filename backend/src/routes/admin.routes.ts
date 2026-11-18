import { Router } from 'express';
import {
  getAdminVendors,
  updateVendorStatus,
  updateUserRole,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// All admin routes strictly require authentication and ADMIN role
router.use(authenticate);
router.use(requireAdmin);

router.get('/vendors', getAdminVendors);
router.patch('/vendors/:id/status', updateVendorStatus);
router.patch('/users/:id/role', updateUserRole);

export default router;
