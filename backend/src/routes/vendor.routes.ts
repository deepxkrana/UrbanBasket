import { Router } from 'express';
import {
  onboardVendor,
  getVendorMe,
  updateVendorMe,
  getVendorProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  deleteProductImage,
  getVendorAnalytics,
} from '../controllers/vendor.controller';
import {
  getVendorOrders,
  updateVendorOrderStatus,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';
import { requireVendor, requireProductOwnership } from '../middleware/roleGuard';

const router = Router();

// All vendor routes require authentication
router.use(authenticate);

// Onboarding: Any authenticated customer can submit vendor application
router.post('/onboard', onboardVendor);

// Store Management: Restricted to VENDOR and ADMIN
router.get('/me', requireVendor, getVendorMe);
router.patch('/me', requireVendor, updateVendorMe);
router.get('/me/analytics', requireVendor, getVendorAnalytics);

// Vendor Order Fulfillment & Lifecycle Management
router.get('/me/orders', requireVendor, getVendorOrders);
router.patch('/me/orders/:id/status', requireVendor, updateVendorOrderStatus);

// Product Catalog CRUD: Restricted to VENDOR and ADMIN
router.get('/me/products', requireVendor, getVendorProducts);
router.post('/me/products', requireVendor, createProduct);

router.patch('/me/products/:id', requireVendor, requireProductOwnership, updateProduct);
router.delete('/me/products/:id', requireVendor, requireProductOwnership, deleteProduct);

// Product Image Management
router.post('/me/products/:id/images', requireVendor, requireProductOwnership, addProductImage);
router.delete(
  '/me/products/:id/images/:imageId',
  requireVendor,
  requireProductOwnership,
  deleteProductImage
);

export default router;
