import { Router } from 'express';
import { ok, fail } from '../utils/response.js';
import * as models from '../models/index.js';

const router = Router();

// GET /api/config — get all system config
router.get('/', (_req, res) => {
  try {
    const rowsMap = models.getConfigs();
    const config = {};
    for (const [key, row] of Object.entries(rowsMap)) {
      config[key] = row.value;
    }
    ok(res, config);
  } catch (err) {
    fail(res, err.message);
  }
});

// GET /api/config/:key — get single config value
router.get('/:key', (req, res) => {
  try {
    const value = models.getConfig(req.params.key);
    if (value === null) return fail(res, 'Config key not found', 404);
    ok(res, { key: req.params.key, value });
  } catch (err) {
    fail(res, err.message);
  }
});

// PUT /api/config/:key — update single config value
router.put('/:key', (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return fail(res, 'Missing value', 400);
    models.setConfig(req.params.key, String(value));
    ok(res, { key: req.params.key, value: String(value) });
  } catch (err) {
    fail(res, err.message);
  }
});

export default router;
