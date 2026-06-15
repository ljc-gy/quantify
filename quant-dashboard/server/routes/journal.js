import { Router } from 'express';
import { getJournal, addJournal, updateJournal, deleteJournal } from '../controllers/journalController.js';

const router = Router();

router.get('/', getJournal);
router.post('/', addJournal);
router.put('/:id', updateJournal);
router.delete('/:id', deleteJournal);

export default router;
