import express from 'express';
import Product from '../models/Product.js';
import StoreInventory from '../models/StoreInventory.js';
import { authRequired, managerOrOwnerRequired } from '../utils/helpers.js';
import { calculateRetail } from '../utils/pricing.js';

const router = express.Router();

router.get('/suggestions', authRequired, managerOrOwnerRequired, async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    const suggestions = [];

    for (const product of products) {
      // Find latest store inventory for this product
      const latestInventory = await StoreInventory.findOne({ productId: product._id })
        .sort({ observedAt: -1, updatedAt: -1 })
        .lean();

      if (!latestInventory) continue;

      const cost = latestInventory.observedPrice || latestInventory.cost;
      if (!cost) continue;

      const suggestedRetail = calculateRetail(cost);
      if (!suggestedRetail) continue;

      const currentPrice = product.price || 0;
      const diff = Math.abs(suggestedRetail - currentPrice);

      // Only suggest if difference is > 0.05
      if (diff > 0.05) {
        suggestions.push({
          productId: product._id,
          name: product.name,
          sku: product.sku,
          currentPrice,
          suggestedRetail,
          lastObservedCost: cost,
          lastObservedAt: latestInventory.observedAt || latestInventory.updatedAt,
          diff
        });
      }
    }

    // Sort by largest difference
    suggestions.sort((a, b) => b.diff - a.diff);

    res.json({ ok: true, suggestions });
  } catch (err) {
    console.error('Failed to fetch price suggestions', err);
    res.status(500).json({ error: 'Failed to fetch price suggestions' });
  }
});

/**
 * GET /api/price-intelligence/market-comparison/:productId
 * Returns prices for a product across different stores based on driver price intelligence
 */
router.get('/market-comparison/:productId', authRequired, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find all store inventory entries for this product
    const inventorries = await StoreInventory.find({ productId })
      .populate('storeId')
      .sort({ updatedAt: -1 })
      .lean();

    const comparison = inventorries.map(inv => ({
      storeName: inv.storeId?.name || 'Unknown Store',
      address: inv.storeId?.address ? 
        `${inv.storeId.address.street}, ${inv.storeId.address.city}` : 'No address',
      price: inv.observedPrice || inv.cost,
      lastVerified: inv.observedAt || inv.updatedAt,
      isDeposit: (inv as any).isDeposit || false
    }));

    res.json({ ok: true, comparison });
  } catch (err) {
    console.error('Failed to fetch market comparison', err);
    res.status(500).json({ error: 'Failed to fetch market comparison' });
  }
});

export default router;
