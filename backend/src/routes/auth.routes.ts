import { Router } from 'express';
import { getMe, syncProfile, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireVendor } from '../middleware/roleGuard';

const router = Router();

// Public / Session
router.post('/logout', logout);

// Protected Auth Routes
router.use(authenticate);

router.get('/me', getMe);
router.post('/sync-profile', syncProfile);

// Verification and RBAC sanity checks
router.get('/vendor-only', requireVendor, (_req, res) => {
  res.status(200).json({ success: true, message: 'Vendor access authorized' });
});

router.get('/admin-only', requireAdmin, (_req, res) => {
  res.status(200).json({ success: true, message: 'Admin access authorized' });
});

export default router;
