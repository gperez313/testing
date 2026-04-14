import User from '../models/User.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Order from '../models/Order.js';
import { recordAuditLog } from '../utils/audit.js';

/**
 * Award loyalty points and credits based on receipt approval
 */
export async function awardLoyaltyForReceipt({ 
  userId, 
  orderId, 
  totalAmount, 
  itemCount, 
  session 
}) {
  if (!userId && !orderId) return { ok: false, reason: 'no_target_user' };

  let targetUserId = userId;
  let order = null;

  // 1. If orderId is provided, prioritize awarding to the customer of that order
  if (orderId) {
    order = await Order.findOne({ orderId }).session(session);
    if (order && order.customerId) {
      targetUserId = order.customerId;
      
      // Prevent double awarding for the same order
      if (order.pointsAwardedAt) {
        return { ok: false, reason: 'points_already_awarded_for_order' };
      }
    }
  }

  if (!targetUserId) return { ok: false, reason: 'target_user_not_found' };

  const user = await User.findOne({ username: targetUserId }).session(session);
  if (!user) return { ok: false, reason: 'user_not_found' };

  // 2. Calculate rewards
  // Example: 1 point per $1 spent, 5 points per item for data contribution
  const pointsFromAmount = Math.floor(totalAmount || 0);
  const pointsFromItems = (itemCount || 0) * 5;
  const totalPoints = pointsFromAmount + pointsFromItems;

  // Example: 1% credit back for orders
  const creditDelta = orderId ? Math.round((totalAmount || 0) * 0.01 * 100) / 100 : 0;

  // 3. Update User
  user.loyaltyPoints = (user.loyaltyPoints || 0) + totalPoints;
  if (creditDelta > 0) {
    user.creditBalance = (user.creditBalance || 0) + creditDelta;
  }
  await user.save({ session });

  // 4. Record Ledger if credit was awarded
  if (creditDelta > 0) {
    await LedgerEntry.create([{
      userId: targetUserId,
      delta: creditDelta,
      reason: `Cashback for order ${orderId}`,
      origin: 'POINTS'
    }], { session });
  }

  // 5. Update Order if applicable
  if (order) {
    order.pointsAwardedAt = new Date();
    await order.save({ session });
  }

  // 6. Audit Log
  await recordAuditLog({
    type: 'loyalty_awarded',
    actorId: 'system',
    details: `userId=${targetUserId} points=${totalPoints} credit=${creditDelta} orderId=${orderId || 'none'}`
  });

  return { 
    ok: true, 
    points: totalPoints, 
    credit: creditDelta, 
    targetUserId 
  };
}
