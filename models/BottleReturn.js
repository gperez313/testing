import mongoose from 'mongoose';

const BottleReturnSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    orderId: { type: String, index: true }, // Associated order if any
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REDEEMED', 'CANCELLED'],
      default: 'PENDING'
    },
    type: {
      type: String,
      enum: ['CREDIT', 'CASH'],
      default: 'CREDIT'
    },
    
    // Customer's initial claim
    claimedUpcs: [{
      upc: { type: String, required: true },
      quantity: { type: Number, required: true }
    }],
    claimedCount: { type: Number, default: 0 },
    estimatedAmount: { type: Number, default: 0 },

    // Driver's verification
    verifiedUpcs: [{
      upc: { type: String },
      quantity: { type: Number }
    }],
    verifiedCount: { type: Number, default: 0 },
    verifiedAmount: { type: Number, default: 0 },
    
    driverId: { type: String, index: true },
    verifiedAt: { type: Date },
    
    // Final settlement
    finalAmount: { type: Number, default: 0 },
    feesApplied: { type: Number, default: 0 },
    redeemedAt: { type: Date },
    
    notes: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('BottleReturn', BottleReturnSchema);
