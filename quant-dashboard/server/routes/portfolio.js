import { Router } from 'express';
import { getHoldings, deleteHolding, saveHolding } from '../controllers/portfolioController.js';

const router = Router();

router.get('/holdings', getHoldings);
router.post('/holdings', saveHolding);
router.put('/holdings/:id', saveHolding);
router.delete('/holdings/:id', deleteHolding);

export default router;
