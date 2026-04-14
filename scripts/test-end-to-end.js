import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import ReceiptCapture from '../models/ReceiptCapture.js';
import LedgerEntry from '../models/LedgerEntry.js';
import { awardLoyaltyForReceipt } from '../services/loyaltyService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ninpo-snacks';

async function runTest() {
  console.log('🚀 Starting End-to-End Dry Run...');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Setup Data
    const testEmail = `test_${Date.now()}@example.com`;
    const user = await User.create({
      email: testEmail,
      username: `testuser_${Date.now()}`,
      membershipTier: 'COMMON',
      loyaltyPoints: 0,
      creditBalance: 0
    });
    console.log('👤 Created User:', user.email);

    const store = await Store.create({
      name: 'Test Market',
      address: { street: '123 Test St', city: 'Dearborn', state: 'MI', zip: '48126' },
      isActive: true
    });
    console.log('🏪 Created Store:', store.name);

    const product = await Product.create({
      name: 'Test Snack',
      sku: 'SNACK-001',
      price: 5.99,
      category: 'SNACKS',
      stock: 100
    });
    console.log('🍕 Created Product:', product.name);

    // 2. Create Order
    const order = await Order.create({
      orderId: `ORD-${Date.now()}`,
      customerId: user._id,
      items: [{
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 2
      }],
      subtotal: 11.98,
      total: 15.00,
      status: 'PAID', // Simulated paid
      paidAt: new Date()
    });
    console.log('📦 Created Order:', order.orderId);

    // 3. Simulate Receipt Upload & Approval
    const receipt = await ReceiptCapture.create({
      captureId: `CAP-${Date.now()}`,
      orderId: order.orderId,
      createdByUserId: user._id,
      status: 'APPROVED',
      totalAmount: 12.50,
      itemCount: 2,
      storeId: store._id
    });
    console.log('📄 Created Approved Receipt:', receipt.captureId);

    // 4. Award Loyalty
    console.log('💰 Awarding Loyalty...');
    const result = await awardLoyaltyForReceipt(receipt.captureId);
    console.log('✅ Loyalty Result:', result);

    // 5. Verify Balances
    const updatedUser = await User.findById(user._id);
    console.log('📊 Final User Balances:');
    console.log(`   - Points: ${updatedUser.loyaltyPoints} (Expected: > 0)`);
    console.log(`   - Credits: $${updatedUser.creditBalance.toFixed(2)} (Expected: > 0)`);

    const ledgerEntries = await LedgerEntry.find({ userId: user._id });
    console.log(`📜 Ledger Entries Found: ${ledgerEntries.length}`);
    ledgerEntries.forEach(entry => {
      console.log(`   - [${entry.type}] ${entry.description}: ${entry.amount > 0 ? '+' : ''}${entry.amount} ${entry.currency}`);
    });

    if (updatedUser.loyaltyPoints > 0 && updatedUser.creditBalance > 0) {
      console.log('\n✨ END-TO-END TEST SUCCESSFUL! ✨');
    } else {
      console.log('\n❌ TEST FAILED: Balances not updated correctly.');
    }

  } catch (err) {
    console.error('❌ TEST ERROR:', err);
  } finally {
    // Cleanup (optional, but good for repeated tests)
    // await User.deleteMany({ email: /test_.*@example.com/ });
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTest();
