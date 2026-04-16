import express from 'express';
import CashPayout from '../models/CashPayout.js';
import { authRequired, ownerRequired } from '../utils/helpers.js';

const router = express.Router();

// GET /api/cash-payouts - List all cash payouts (Admin only)
router.get('/', authRequired, ownerRequired, async (req, res) => {
  try {
    const payouts = await CashPayout.find().sort({ createdAt: -1 });
    res.json(payouts);
  } catch (_err) {
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

// PATCH /api/cash-payouts/:id - Update payout status (Admin only)
router.patch('/:id', authRequired, ownerRequired, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['CREATED', 'PAID', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const payout = await CashPayout.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    res.json(payout);
  } catch (_err) {
    res.status(500).json({ error: 'Failed to update payout' });
  }
});

export default router;
