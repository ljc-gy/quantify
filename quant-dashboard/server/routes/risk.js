import { Router } from 'express';
import { getRiskAssessment, getVolatilityCone } from '../controllers/riskController.js';

const router = Router();

router.get('/assessment', getRiskAssessment);
router.get('/volatility-cone', getVolatilityCone);

export default router;
