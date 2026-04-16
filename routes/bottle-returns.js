import express from 'express';
import BottleReturn from '../models/BottleReturn.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import CashPayout from '../models/CashPayout.js';
import { authRequired } from '../utils/helpers.js';

const router = express.Router();

// Get bottle returns for the current user
router.get('/', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const returns = await BottleReturn.find({ userId }).sort({ createdAt: -1 });
    res.json(returns);
  } catch (error) {
    console.error('Error fetching user returns:', error);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

// Customer submits a bottle return claim
router.post('/', authRequired, async (req, res) => {
  try {
    const { claimedUpcs, estimatedAmount, type, orderId } = req.body;
    const userId = req.user.id;

    const claimedCount = claimedUpcs.reduce((sum, item) => sum + item.quantity, 0);

    const bottleReturn = new BottleReturn({
      userId,
      orderId,
      claimedUpcs,
      claimedCount,
      estimatedAmount,
      type: type || 'CREDIT',
      status: 'PENDING'
    });

    await bottleReturn.save();
    res.status(201).json(bottleReturn);
  } catch (error) {
    console.error('Error creating bottle return:', error);
    res.status(500).json({ error: 'Failed to create bottle return' });
  }
});

// Get pending bottle returns for a driver (for their active orders)
router.get('/pending', authRequired, async (req, res) => {
  try {
    // Drivers can see pending returns
    const returns = await BottleReturn.find({ status: 'PENDING' }).sort({ createdAt: -1 });
    res.json(returns);
  } catch (error) {
    console.error('Error fetching pending returns:', error);
    res.status(500).json({ error: 'Failed to fetch pending returns' });
  }
});

// Driver verifies a bottle return
router.post('/:id/verify', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedUpcs, verifiedCount, verifiedAmount, notes } = req.body;
    const driverId = req.user.id;

    const bottleReturn = await BottleReturn.findById(id);
    if (!bottleReturn) {
      return res.status(404).json({ error: 'Bottle return not found' });
    }

    bottleReturn.verifiedUpcs = verifiedUpcs;
    bottleReturn.verifiedCount = verifiedCount;
    bottleReturn.verifiedAmount = verifiedAmount;
    bottleReturn.driverId = driverId;
    bottleReturn.verifiedAt = new Date();
    bottleReturn.status = 'VERIFIED';
    bottleReturn.notes = notes;

    await bottleReturn.save();

    // If it's associated with an order, we might want to update the order as well
    if (bottleReturn.orderId) {
      await Order.findOneAndUpdate(
        { orderId: bottleReturn.orderId },
        { 
          verifiedReturnCredit: bottleReturn.type === 'CREDIT' ? verifiedAmount : 0,
          verifiedReturnCash: bottleReturn.type === 'CASH' ? verifiedAmount : 0
        }
      );
    }

    res.json(bottleReturn);
  } catch (error) {
    console.error('Error verifying bottle return:', error);
    res.status(500).json({ error: 'Failed to verify bottle return' });
  }
});

// Finalize/Redeem bottle return
router.post('/:id/redeem', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const bottleReturn = await BottleReturn.findById(id);
    if (!bottleReturn) {
      return res.status(404).json({ error: 'Bottle return not found' });
    }

    if (bottleReturn.status !== 'VERIFIED') {
      return res.status(400).json({ error: 'Bottle return must be verified before redemption' });
    }

    const user = await User.findById(bottleReturn.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let finalAmount = bottleReturn.verifiedAmount;
    let feesApplied = 0;

    if (bottleReturn.type === 'CASH') {
      // Apply fees for cash redemption
      // "Can be redeemed for cash minus fees"
      // Let's assume a 10% fee or similar if not specified, 
      // but I'll check if there's a standard fee in the app.
      // In routes/payments.js I saw CASH_HANDLING_FEE_PER_CONTAINER = 0.02
      feesApplied = bottleReturn.verifiedCount * 0.02; 
      finalAmount = Math.max(0, finalAmount - feesApplied);
    }

    bottleReturn.finalAmount = finalAmount;
    bottleReturn.feesApplied = feesApplied;
    bottleReturn.redeemedAt = new Date();
    bottleReturn.status = 'REDEEMED';

    await bottleReturn.save();

    // Apply credit to user balance if it's CREDIT
    if (bottleReturn.type === 'CREDIT') {
      user.creditBalance = (user.creditBalance || 0) + finalAmount;
      await user.save();
    } else if (bottleReturn.type === 'CASH') {
      // Create a CashPayout record
      const cashPayout = new CashPayout({
        orderId: bottleReturn.orderId || 'MANUAL',
        userId: bottleReturn.userId,
        driverId: bottleReturn.driverId,
        amount: finalAmount,
        status: 'CREATED'
      });
      await cashPayout.save();
    }

    res.json(bottleReturn);
  } catch (error) {
    console.error('Error redeeming bottle return:', error);
    res.status(500).json({ error: 'Failed to redeem bottle return' });
  }
});

export default router;
