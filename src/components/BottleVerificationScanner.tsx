import React, { useState, useMemo, useCallback } from 'react';
import { CheckCircle2, Trash2, Plus, Minus } from 'lucide-react';
import InlineScanner from './InlineScanner';
import { ScannerMode } from '../types';

interface BottleVerificationScannerProps {
  claimedUpcs: Array<{ upc: string; quantity: number }>;
  onVerify: (verifiedUpcs: Array<{ upc: string; quantity: number }>, verifiedCount: number, verifiedAmount: number) => void;
  onCancel: () => void;
}

const MI_DEPOSIT_VALUE = 0.1;

const BottleVerificationScanner: React.FC<BottleVerificationScannerProps> = ({
  claimedUpcs,
  onVerify,
  onCancel
}) => {
  const [verifiedUpcs, setVerifiedUpcs] = useState<Array<{ upc: string; quantity: number }>>(
    claimedUpcs.map(u => ({ ...u }))
  );

  const totalVerifiedCount = useMemo(() => 
    verifiedUpcs.reduce((sum, u) => sum + u.quantity, 0), 
  [verifiedUpcs]);

  const totalVerifiedAmount = useMemo(() => 
    totalVerifiedCount * MI_DEPOSIT_VALUE, 
  [totalVerifiedCount]);

  const handleScan = useCallback((upc: string) => {
    setVerifiedUpcs(prev => {
      const existing = prev.find(u => u.upc === upc);
      if (existing) {
        return prev.map(u => u.upc === upc ? { ...u, quantity: u.quantity + 1 } : u);
      } else {
        return [...prev, { upc, quantity: 1 }];
      }
    });
  }, []);

  const updateQuantity = (upc: string, delta: number) => {
    setVerifiedUpcs(prev => 
      prev.map(u => u.upc === upc ? { ...u, quantity: Math.max(0, u.quantity + delta) } : u)
          .filter(u => u.quantity > 0)
    );
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-ninpo-black flex flex-col">
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-ninpo-card">
        <div>
          <h2 className="text-white font-black uppercase text-lg tracking-widest">Bottle Verification</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Verify customer's claimed bottle returns</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition">
          <Trash2 className="w-6 h-6 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 relative bg-black">
          <InlineScanner
            mode={ScannerMode.DRIVER_ORDER_SCAN}
            onScan={handleScan}
            title="Scan Bottles"
            subtitle="Verify each container"
          />
        </div>

        <div className="w-full lg:w-96 bg-ninpo-card border-l border-white/10 flex flex-col">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Claimed</p>
                <p className="text-2xl font-black text-white">
                  {claimedUpcs.reduce((sum, u) => sum + u.quantity, 0)}
                </p>
              </div>
              <div className="bg-ninpo-lime/10 p-4 rounded-2xl border border-ninpo-lime/20">
                <p className="text-[9px] text-ninpo-lime font-black uppercase tracking-widest mb-1">Verified</p>
                <p className="text-2xl font-black text-ninpo-lime">{totalVerifiedCount}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-2">Verification List</h3>
              {verifiedUpcs.map(u => (
                <div key={u.upc} className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-white font-bold truncate">{u.upc}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-black mt-1">${(u.quantity * MI_DEPOSIT_VALUE).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQuantity(u.upc, -1)} className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-white">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-white font-black text-sm w-6 text-center">{u.quantity}</span>
                    <button onClick={() => updateQuantity(u.upc, 1)} className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-white">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-white/10 bg-black/20 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Credit</p>
                <p className="text-3xl font-black text-ninpo-lime">${totalVerifiedAmount.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Containers</p>
                <p className="text-xl font-black text-white">{totalVerifiedCount}</p>
              </div>
            </div>

            <button
              onClick={() => onVerify(verifiedUpcs, totalVerifiedCount, totalVerifiedAmount)}
              className="w-full py-5 bg-ninpo-lime text-ninpo-black rounded-2xl font-black uppercase tracking-widest shadow-neon flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Complete Verification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottleVerificationScanner;
