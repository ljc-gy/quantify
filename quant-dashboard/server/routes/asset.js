import { Router } from 'express';
import { getAssetOverview } from '../controllers/assetController.js';

const router = Router();

router.get('/overview', getAssetOverview);

export default router;
