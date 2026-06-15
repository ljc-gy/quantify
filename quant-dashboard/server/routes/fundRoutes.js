import { Router } from "express";
import {
  getFunds,
  addFund,
  updateFund,
  deleteFund,
  getPlans,
  addPlan,
  updatePlan,
  deletePlan,
  getSnapshots,
  addSnapshot,
  snapshotAll,
  refreshNav,
  resolveFundInfo,
  getYesterdayReturn,
  getFundHistory,
  getPortfolioTrend,
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getFundSummary,
  getPortfolioSummary,
} from '../controllers/fundController.js';

const router = Router();

// Fund CRUD
router.get('/list', getFunds);
router.post('/add', addFund);
router.get('/portfolio-summary', getPortfolioSummary);
router.get('/:fundId/summary', getFundSummary);
router.get('/:fundId/transactions', getTransactions);
router.post('/:fundId/transactions', addTransaction);
router.put('/transactions/:id', updateTransaction);
router.delete('/transactions/:id', deleteTransaction);
router.put('/:id', updateFund);
router.delete('/:id', deleteFund);

// Fund code resolution (name + type from East Money)
router.get('/resolve/:code', resolveFundInfo);

// Auto-invest plans
router.get('/plans', getPlans);
router.post('/plans', addPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// NAV snapshots
router.get('/snapshots', getSnapshots);
router.post('/snapshot', addSnapshot);
router.post('/snapshot-all', snapshotAll);
router.post('/refresh-nav', refreshNav);

// Yesterday return
// Portfolio NAV trend
router.get('/portfolio-trend', getPortfolioTrend);

// Yesterday return
router.get('/yesterday-return', getYesterdayReturn);
router.get('/history/:code', getFundHistory);

export default router;
