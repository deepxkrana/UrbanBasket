import { Router } from 'express';
import { getAddresses, createAddress } from '../controllers/address.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Address management requires authentication
router.use(authenticate);

router.get('/', getAddresses);
router.post('/', createAddress);

export default router;
