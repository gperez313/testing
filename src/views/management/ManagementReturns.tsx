import React, { useState } from 'react';
import { CheckCircle2, Loader2, ScanLine, Truck, User, Calendar, Coins, Zap } from 'lucide-react';
import { Order, OrderStatus, ReturnUpcCount } from '../../types';
import { ScannerMode } from '../../types';

interface ManagementReturnsProps {
  orders: Order[];
  updateOrder: (_: string, __: OrderStatus, ___?: any) => void;
  openUnifiedScannerModal: (_: ScannerMode) => void;
  returnScanEntries: ReturnUpcCount[];
  setReturnScanEntries: (_: ReturnUpcCount[]) => void;
}

const ManagementReturns: React.FC<ManagementReturnsProps> = ({
  orders,
  updateOrder,
  openUnifiedScannerModal,
  returnScanEntries,
  setReturnScanEntries
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const pendingReturns = orders.filter(
    o => o.orderType === 'RETURNS_PICKUP' && ['DELIVERED', 'PICKED_UP', 'PENDING'].includes(o.status)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selectedOrder = orders.find(o => o.orderId === selectedOrderId);

  const handleApprove = async (orderId: string) => {
    setIsApproving(orderId);
    try {
      // If we have scanned entries, we should probably update the order first or pass them in metadata
      const metadata: any = {};
      if (returnScanEntries.length > 0) {
        metadata.verifiedReturnUpcCounts = returnScanEntries;
      }
      
      await updateOrder(orderId, OrderStatus.APPROVED, metadata);
      setSelectedOrderId(null);
      setReturnScanEntries([]);
    } catch (err) {
      console.error('Approval failed', err);
    } finally {
      setIsApproving(null);
    }
  };

  const fmtTime = (date?: string | Date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase text-white tracking-widest">
          Return Reviews
        </h2>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">
          Review driver-submitted container verifications and approve settlements.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List of Pending Returns */}
        <div className="lg:col-span-1 space-y-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">
            Pending Approval ({pendingReturns.length})
          </div>
          <div className="space-y-3">
            {pendingReturns.map(order => (
              <button
                key={order.orderId}
                onClick={() => {
                  setSelectedOrderId(order.orderId);
                  setReturnScanEntries(order.verifiedReturnUpcCounts || order.returnUpcCounts || []);
                }}
                className={`w-full text-left p-6 rounded-[2rem] border transition-all space-y-3 ${
                  selectedOrderId === order.orderId
                    ? 'bg-ninpo-lime/10 border-ninpo-lime shadow-neon'
                    : 'bg-ninpo-card border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    #{order.orderId.slice(-6)}
                  </span>
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                    order.status === 'DELIVERED' ? 'bg-ninpo-lime/20 text-ninpo-lime' : 'bg-white/10 text-slate-400'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase truncate">{order.customerId}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] font-black text-white">
                    ${(order.estimatedReturnCredit || 0).toFixed(2)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-600">
                    {fmtTime(order.createdAt)}
                  </span>
                </div>
              </button>
            ))}
            {pendingReturns.length === 0 && (
              <div className="p-10 text-center bg-ninpo-card rounded-[2.5rem] border border-white/5">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  No returns pending approval
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Review Detail */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <div className="bg-ninpo-card border border-white/5 rounded-[3rem] p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-white font-black uppercase text-xl tracking-widest">
                    Order #{selectedOrder.orderId}
                  </h3>
                  <div className="flex items-center gap-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtTime(selectedOrder.createdAt)}</span>
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {selectedOrder.driverId || 'Unassigned'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-6 py-4 rounded-2xl border flex flex-col items-center justify-center min-w-[120px] ${
                    selectedOrder.returnPayoutMethod === 'CASH' ? 'bg-ninpo-lime/10 border-ninpo-lime' : 'bg-white/5 border-white/10'
                  }`}>
                    {selectedOrder.returnPayoutMethod === 'CASH' ? <Zap className="w-5 h-5 text-ninpo-lime mb-1" /> : <Coins className="w-5 h-5 text-slate-400 mb-1" />}
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{selectedOrder.returnPayoutMethod}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/40 rounded-[2rem] p-8 border border-white/5 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Customer Estimate</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">${(selectedOrder.estimatedReturnCredit || 0).toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Total Value</span>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-white/5">
                    {(selectedOrder.returnUpcCounts || []).map(item => (
                      <div key={item.upc} className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-slate-400">{item.upc}</span>
                        <span className="text-white">× {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-ninpo-lime/5 rounded-[2rem] p-8 border border-ninpo-lime/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ninpo-lime">Verified Counts</p>
                      <span className="px-2 py-0.5 rounded-md bg-ninpo-lime/20 text-ninpo-lime text-[8px] font-black uppercase tracking-widest">MI 10¢</span>
                    </div>
                    <button
                      onClick={() => openUnifiedScannerModal(ScannerMode.CUSTOMER_RETURN_SCAN)}
                      className="p-2 rounded-xl bg-ninpo-lime text-ninpo-black hover:scale-110 transition-all"
                    >
                      <ScanLine className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">
                      {returnScanEntries.reduce((sum, i) => sum + i.quantity, 0)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Containers</span>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    {returnScanEntries.length > 0 ? (
                      returnScanEntries.map(item => (
                        <div key={item.upc} className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-slate-300">{item.upc}</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setReturnScanEntries(returnScanEntries.map(i => i.upc === item.upc ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i))}
                              className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                            >
                              -
                            </button>
                            <span className="text-white w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => setReturnScanEntries(returnScanEntries.map(i => i.upc === item.upc ? { ...i, quantity: i.quantity + 1 } : i))}
                              className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-500 uppercase font-bold text-center py-4">No containers verified yet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-6">
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="flex-1 py-5 bg-white/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  disabled={!!isApproving}
                  onClick={() => handleApprove(selectedOrder.orderId)}
                  className="flex-[2] py-5 bg-ninpo-lime text-ninpo-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-neon hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  {isApproving === selectedOrder.orderId ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  Approve & Process Payout
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-ninpo-card border border-white/5 border-dashed rounded-[3rem] p-10 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <Truck className="w-10 h-10 text-slate-600" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-black uppercase text-sm tracking-widest">Select a Return</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Choose an order from the list to review and approve.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagementReturns;
