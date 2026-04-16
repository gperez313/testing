import React, { useState, useEffect } from 'react';
import { CashPayout } from '../types';
import { CheckCircle, XCircle, Clock, DollarSign, User, Truck, Hash } from 'lucide-react';
import { format } from 'date-fns';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function AdminCashPayouts() {
  const [payouts, setPayouts] = useState<CashPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cash-payouts`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch payouts');
      const data = await res.json();
      setPayouts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const updateStatus = async (id: string, status: 'PAID' | 'CANCELLED') => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/cash-payouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      setPayouts(prev => prev.map(p => p._id === id ? { ...p, status } : p));
    } catch (err: any) {
      console.error('Update status error:', err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading payouts...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="text-green-600" />
          Cash Payout Management
        </h2>
        <button 
          onClick={fetchPayouts}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {payouts.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
            No cash payouts found.
          </div>
        ) : (
          payouts.map(payout => (
            <div 
              key={payout._id} 
              className={`bg-white p-5 rounded-xl border transition-all ${
                payout.status === 'PAID' ? 'border-green-100 bg-green-50/10' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Hash size={14} />
                    <span>Order: {payout.orderId}</span>
                    <span className="mx-1">•</span>
                    <Clock size={14} />
                    <span>{format(new Date(payout.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <User size={16} className="text-gray-400" />
                      <span className="font-medium">User: {payout.userId}</span>
                    </div>
                    {payout.driverId && (
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Truck size={16} className="text-gray-400" />
                        <span className="font-medium">Driver: {payout.driverId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${payout.amount.toFixed(2)}
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-wider mt-1 ${
                      payout.status === 'PAID' ? 'text-green-600' : 
                      payout.status === 'CANCELLED' ? 'text-red-500' : 'text-amber-500'
                    }`}>
                      {payout.status}
                    </div>
                  </div>

                  {payout.status === 'CREATED' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(payout._id, 'PAID')}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        title="Mark as Paid"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button
                        onClick={() => updateStatus(payout._id, 'CANCELLED')}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                        title="Cancel Payout"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
