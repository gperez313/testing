import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import CashPayout from '../models/CashPayout.js';
import StoreInventory from '../models/StoreInventory.js';
import {
  authRequired,
  isDriverUsername,
  mapOrderForFrontend
} from '../utils/helpers.js';
import { recordAuditLog } from '../utils/audit.js';
import { isDbReady } from '../db/connect.js';

const router = express.Router();

/**
 * Middleware: Verify driver access
 */
const driverOnly = (req, res, next) => {
  if (!isDriverUsername(req.user?.username)) {
    return res.status(403).json({ error: 'Driver access required' });
  }
  next();
};

/**
 * GET /api/driver/pending-orders
 * List orders awaiting assignment (status: PENDING)
 * Drivers can browse available work
 */
router.get('/pending-orders', driverOnly, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  try {
    const orders = await Order.find({
      status: 'PENDING',
      driverId: { $in: [null, ''] }
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    const result = orders.map(mapOrderForFrontend);
    res.json({ ok: true, orders: result });
  } catch (err) {
    console.error('PENDING ORDERS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
});

/**
 * GET /api/driver/assigned-orders
 * List orders assigned to current driver
 */
router.get('/assigned-orders', authRequired, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  try {
    const driverId = req.user?.username || req.user?.id;
    const orders = await Order.find({
      driverId,
      status: { $in: ['ASSIGNED', 'PICKED_UP', 'ARRIVING', 'DELIVERED'] }
    })
      .sort({ createdAt: -1 })
      .lean();

    const result = orders.map(mapOrderForFrontend);
    res.json({ ok: true, orders: result });
  } catch (err) {
    console.error('ASSIGNED ORDERS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch assigned orders' });
  }
});

/**
 * POST /api/driver/accept-order
 * Driver accepts and assigns themselves to an order
 */
router.post('/accept-order', driverOnly, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  const sessionDb = await mongoose.startSession();

  try {
    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const driverId = req.user?.username || req.user?.id;

    await sessionDb.withTransaction(async () => {
      const order = await Order.findOne({ orderId }).session(sessionDb);
      if (!order) {
        throw new Error('Order not found');
      }
      if (order.status !== 'PENDING') {
        throw new Error('Order is no longer pending');
      }

      order.driverId = driverId;
      order.status = 'ASSIGNED';
      await order.save({ session: sessionDb });

      await recordAuditLog({
        type: 'ORDER_ASSIGNED',
        actorId: driverId,
        details: `Driver ${driverId} assigned to order ${orderId}`
      });
    });

    const updated = await Order.findOne({ orderId }).lean();
    res.json({ ok: true, order: mapOrderForFrontend(updated) });
  } catch (err) {
    console.error('ACCEPT ORDER ERROR:', err);
    res.status(400).json({ error: err?.message || 'Failed to accept order' });
  } finally {
    sessionDb.endSession();
  }
});

/**
 * POST /api/driver/pickup-order
 * Driver picks up items from store(s)
 */
router.post('/pickup-order', driverOnly, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  const sessionDb = await mongoose.startSession();

  try {
    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const driverId = req.user?.username || req.user?.id;

    await sessionDb.withTransaction(async () => {
      const order = await Order.findOne({ orderId }).session(sessionDb);
      if (!order) {
        throw new Error('Order not found');
      }
      if (order.driverId !== driverId) {
        throw new Error('This order is not assigned to you');
      }
      if (order.status !== 'ASSIGNED') {
        throw new Error('Order is not in ASSIGNED status');
      }

      order.status = 'PICKED_UP';
      order.pickedUpAt = new Date();
      await order.save({ session: sessionDb });

      await recordAuditLog({
        type: 'ORDER_PICKED_UP',
        actorId: driverId,
        details: `Order ${orderId} picked up`
      });
    });

    const updated = await Order.findOne({ orderId }).lean();
    res.json({ ok: true, order: mapOrderForFrontend(updated) });
  } catch (err) {
    console.error('PICKUP ORDER ERROR:', err);
    res.status(400).json({ error: err?.message || 'Failed to pick up order' });
  } finally {
    sessionDb.endSession();
  }
});

/**
 * POST /api/driver/start-delivery
 * Driver starts delivery route (navigating to customer)
 */
router.post('/start-delivery', driverOnly, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  const sessionDb = await mongoose.startSession();

  try {
    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const driverId = req.user?.username || req.user?.id;

    await sessionDb.withTransaction(async () => {
      const order = await Order.findOne({ orderId }).session(sessionDb);
      if (!order) {
        throw new Error('Order not found');
      }
      if (order.driverId !== driverId) {
        throw new Error('This order is not assigned to you');
      }
      if (order.status !== 'PICKED_UP') {
        throw new Error('Order must be picked up before delivery');
      }

      order.status = 'ARRIVING';
      order.deliveryStartedAt = new Date();
      await order.save({ session: sessionDb });

      await recordAuditLog({
        type: 'ORDER_DELIVERY_STARTED',
        actorId: driverId,
        details: `Order ${orderId} delivery started - driver en route`
      });
    });

    const updated = await Order.findOne({ orderId }).lean();
    res.json({ ok: true, order: mapOrderForFrontend(updated) });
  } catch (err) {
    console.error('START DELIVERY ERROR:', err);
    res.status(400).json({ error: err?.message || 'Failed to start delivery' });
  } finally {
    sessionDb.endSession();
  }
});

/**
 * POST /api/driver/complete-delivery
 * Driver completes delivery with optional photo
 */
router.post('/complete-delivery', driverOnly, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  const sessionDb = await mongoose.startSession();

  try {
    const orderId = String(req.body?.orderId || '').trim();
    const deliveryPhotoBase64 = req.body?.deliveryPhoto || null;
    const customerSignature = req.body?.customerSignature || null;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const driverId = req.user?.username || req.user?.id;

    await sessionDb.withTransaction(async () => {
      const order = await Order.findOne({ orderId }).session(sessionDb);
      if (!order) {
        throw new Error('Order not found');
      }
      if (order.driverId !== driverId) {
        throw new Error('This order is not assigned to you');
      }
      if (order.status !== 'ARRIVING') {
        throw new Error('Order must be in ARRIVING status');
      }

      order.status = 'DELIVERED';
      order.deliveredAt = new Date();
      if (deliveryPhotoBase64) {
        order.deliveryProof = {
          photo: deliveryPhotoBase64,
          capturedAt: new Date()
        };
      }
      if (customerSignature) {
        order.customerSignature = {
          signature: customerSignature,
          signedAt: new Date()
        };
      }
      await order.save({ session: sessionDb });

      await recordAuditLog({
        type: 'ORDER_DELIVERED',
        actorId: driverId,
        details: `Order ${orderId} delivered to customer`
      });
    });

    const updated = await Order.findOne({ orderId }).lean();
    res.json({ ok: true, order: mapOrderForFrontend(updated) });
  } catch (err) {
    console.error('COMPLETE DELIVERY ERROR:', err);
    res.status(400).json({ error: err?.message || 'Failed to complete delivery' });
  } finally {
    sessionDb.endSession();
  }
});

/**
 * GET /api/driver/shopping-list
 * Get detailed shopping list with stores and items
 */
router.get('/shopping-list', driverOnly, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  try {
    const orderId = String(req.query?.orderId || '').trim();
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const order = await Order.findOne({ orderId }).lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const driverId = req.user?.username || req.user?.id;
    if (order.driverId !== driverId) {
      return res.status(403).json({ error: 'This order is not assigned to you' });
    }

    // Fetch product details and organize by store
    const productIds = (order.items || []).map(it => it.productId);
    const products = await Product.find({ frontendId: { $in: productIds } }).lean();
    const productMap = new Map(products.map(p => [p.frontendId, p]));

    // Fetch store details
    const storeIds = [...new Set((order.items || []).map(it => it.storeId).filter(Boolean))];
    const stores = await Store.find({ _id: { $in: storeIds } }).lean();
    const storeMap = new Map(stores.map(s => [s._id.toString(), s]));

    const shoppingList = (order.items || []).map(item => {
      const product = productMap.get(item.productId);
      const store = storeMap.get(item.storeId);
      const storeAddress = store ? `${store.address.street}, ${store.address.city}, ${store.address.state} ${store.address.zip}` : '';
      
      return {
        productId: item.productId,
        name: product?.name || item.productId,
        quantity: item.quantity,
        price: product?.price || 0,
        instructions: product?.storageInstructions || '',
        store: store?.name || 'Unknown Store',
        storeId: item.storeId,
        storeAddress
      };
    });

    res.json({
      ok: true,
      orderId,
      address: order.address,
      shoppingList,
      itemCount: shoppingList.reduce((sum, it) => sum + it.quantity, 0),
      estimatedTime: order.distanceMiles ? Math.ceil(order.distanceMiles / 30 * 60) : 30
    });
  } catch (err) {
    console.error('SHOPPING LIST ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
});

/**
 * GET /api/driver/earnings
 * Driver earnings summary (today, this week, this month)
 */
router.get('/earnings', authRequired, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  try {
    const driverId = req.user?.username || req.user?.id;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayOrders, weekOrders, monthOrders] = await Promise.all([
      Order.find({
        driverId,
        deliveredAt: { $gte: today },
        status: 'DELIVERED'
      }).lean(),
      Order.find({
        driverId,
        deliveredAt: { $gte: weekStart },
        status: 'DELIVERED'
      }).lean(),
      Order.find({
        driverId,
        deliveredAt: { $gte: monthStart },
        status: 'DELIVERED'
      }).lean()
    ]);

    const sumRouteFees = (orders) =>
      orders.reduce((sum, o) => sum + Number(o.routeFeeFinal || 0), 0);
    const sumDistanceFees = (orders) =>
      orders.reduce((sum, o) => sum + Number(o.distanceFeeFinal || 0), 0);
    const sumAllFees = (orders) =>
      sumRouteFees(orders) + sumDistanceFees(orders) + 
      orders.reduce((sum, o) => sum + Number(o.largeOrderFee || 0) + Number(o.heavyItemFee || 0), 0);

    res.json({
      ok: true,
      today: {
        deliveries: todayOrders.length,
        routeFees: sumRouteFees(todayOrders),
        distanceFees: sumDistanceFees(todayOrders),
        totalFees: sumAllFees(todayOrders),
        totalDistance: todayOrders.reduce((sum, o) => sum + Number(o.distanceMiles || 0), 0)
      },
      week: {
        deliveries: weekOrders.length,
        routeFees: sumRouteFees(weekOrders),
        distanceFees: sumDistanceFees(weekOrders),
        totalFees: sumAllFees(weekOrders),
        totalDistance: weekOrders.reduce((sum, o) => sum + Number(o.distanceMiles || 0), 0)
      },
      month: {
        deliveries: monthOrders.length,
        routeFees: sumRouteFees(monthOrders),
        distanceFees: sumDistanceFees(monthOrders),
        totalFees: sumAllFees(monthOrders),
        totalDistance: monthOrders.reduce((sum, o) => sum + Number(o.distanceMiles || 0), 0)
      }
    });
  } catch (err) {
    console.error('EARNINGS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

/**
 * GET /api/driver/performance
 * Driver performance metrics
 */
router.get('/performance', authRequired, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  try {
    const driverId = req.user?.username || req.user?.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [allOrders, completedOrders] = await Promise.all([
      Order.find({
        driverId,
        createdAt: { $gte: thirtyDaysAgo }
      }).lean(),
      Order.find({
        driverId,
        status: 'DELIVERED',
        deliveredAt: { $gte: thirtyDaysAgo }
      }).lean()
    ]);

    const avgCompletionTime = completedOrders.length > 0
      ? completedOrders.reduce((sum, o) => {
          const start = new Date(o.deliveryStartedAt || o.createdAt);
          const end = new Date(o.deliveredAt);
          return sum + (end - start) / 1000 / 60; // minutes
        }, 0) / completedOrders.length
      : 0;

    res.json({
      ok: true,
      thirtyDayStats: {
        totalOrders: allOrders.length,
        completedOrders: completedOrders.length,
        completionRate: allOrders.length > 0 ? (completedOrders.length / allOrders.length) : 0,
        avgCompletionTimeMinutes: Math.round(avgCompletionTime),
        totalDeliveries: completedOrders.length,
        totalDistance: completedOrders.reduce((sum, o) => sum + Number(o.distanceMiles || 0), 0),
        avgDeliveryDistance: completedOrders.length > 0
          ? completedOrders.reduce((sum, o) => sum + Number(o.distanceMiles || 0), 0) / completedOrders.length
          : 0
      }
    });
  } catch (err) {
    console.error('PERFORMANCE ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

/**
 * GET /api/driver/cash-reconciliation
 * Driver cash payout reconciliation (today's authorized payouts)
 */
router.get('/cash-reconciliation', authRequired, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  try {
    const driverId = req.user?.username || req.user?.id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const payouts = await CashPayout.find({
      driverId,
      createdAt: { $gte: today },
      status: { $ne: 'CANCELLED' }
    }).lean();

    const totalAmount = payouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    res.json({
      ok: true,
      today: {
        count: payouts.length,
        totalAmount,
        payouts: payouts.map(p => ({
          id: p._id,
          amount: p.amount,
          orderId: p.orderId,
          status: p.status,
          createdAt: p.createdAt
        }))
      }
    });
  } catch (err) {
    console.error('CASH RECONCILIATION ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch cash reconciliation' });
  }
});

/**
 * GET /api/driver/price-intelligence-stats
 * Returns count of price updates contributed by the driver
 */
router.get('/price-intelligence-stats', authRequired, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  try {
    const driverId = req.user?.username || req.user?.id;
    
    // Count entries in priceHistory across all StoreInventory documents
    const stats = await StoreInventory.aggregate([
      { $unwind: '$priceHistory' },
      { $match: { 'priceHistory.confirmedBy': driverId } },
      { $group: { _id: null, totalContributions: { $sum: 1 } } }
    ]);

    res.json({
      ok: true,
      totalContributions: stats[0]?.totalContributions || 0
    });
  } catch (err) {
    console.error('PRICE INTELLIGENCE STATS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch price intelligence stats' });
  }
});

/**
 * GET /api/driver/leaderboard
 * Returns top drivers by price intelligence contributions
 */
router.get('/leaderboard', authRequired, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  try {
    const leaderboard = await StoreInventory.aggregate([
      { $unwind: '$priceHistory' },
      { $match: { 'priceHistory.confirmedBy': { $exists: true, $ne: null } } },
      { 
        $group: { 
          _id: '$priceHistory.confirmedBy', 
          contributions: { $sum: 1 } 
        } 
      },
      { $sort: { contributions: -1 } },
      { $limit: 10 }
    ]);

    // Enhance with "masked" names if needed or just return driver IDs
    res.json({
      ok: true,
      leaderboard: leaderboard.map((l, index) => ({
        rank: index + 1,
        driverId: l._id,
        contributions: l.contributions
      }))
    });
  } catch (err) {
    console.error('LEADERBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/driver/missions
 * Returns "Missions" for drivers: products in stores that haven't been verified in 14+ days
 */
router.get('/missions', authRequired, async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  try {
    const { storeId } = req.query;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    // Find inventory that is "stale"
    const query: any = {
      $or: [
        { observedAt: { $lt: fourteenDaysAgo } },
        { observedAt: { $exists: false } },
        { observedAt: null }
      ],
      available: true
    };

    if (storeId && mongoose.Types.ObjectId.isValid(storeId as string)) {
      query.storeId = storeId;
    }

    const missions = await StoreInventory.find(query)
    .populate('productId')
    .populate('storeId')
    .sort({ observedAt: 1 })
    .limit(20)
    .lean();

    const result = missions.map(m => ({
      id: m._id,
      productName: m.productId?.name || 'Unknown Product',
      storeName: m.storeId?.name || 'Unknown Store',
      lastObserved: m.observedAt || m.updatedAt,
      bountyPoints: 50, // Static bounty for now
      sku: m.sku || m.productId?.sku
    }));

    res.json({ ok: true, missions: result });
  } catch (err) {
    console.error('MISSIONS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch driver missions' });
  }
});

export default router;
