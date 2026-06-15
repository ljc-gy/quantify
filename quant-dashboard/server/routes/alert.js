import { Router } from 'express';
import { getAlerts, setAlert, deleteAlert, updateAlert, autoSLTP } from '../controllers/alertController.js';

const router = Router();

router.get('/list', getAlerts);
router.post('/set', setAlert);
router.delete('/:id', deleteAlert);
router.patch('/:id', updateAlert);
router.post('/auto-sl-tp', autoSLTP);

export default router;
