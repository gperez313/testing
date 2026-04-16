import React, { useEffect, useState } from 'react';
import { BACKEND_URL } from '../constants';
import { MapPin, Clock, Info } from 'lucide-react';

interface ComparisonEntry {
  storeName: string;
  address: string;
  price: number;
  lastVerified: string;
  isDeposit: boolean;
}

interface ProductMarketIntelligenceProps {
  productId: string;
  onClose: () => void;
}

const ProductMarketIntelligence: React.FC<ProductMarketIntelligenceProps> = ({ productId, onClose }) => {
  const [comparison, setComparison] = useState<ComparisonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/price-intelligence/market-comparison/${productId}`, {
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch market data');
        const data = await res.json();
        setComparison(data.comparison || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, [productId]);

  return (
    <div className="bg-ninpo-black/90 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 w-full max-w-2xl mx-auto space-y-8 animate-in zoom-in duration-300 shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-black uppercase text-xl tracking-widest flex items-center gap-3">
          <Info className="w-6 h-6 text-ninpo-lime" /> Market Intelligence
        </h3>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"
        >
          &times;
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-ninpo-lime/20 border-t-ninpo-lime animate-spin" />
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Scanning local markets...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <p className="text-red-400 text-sm font-bold uppercase">{error}</p>
        </div>
      ) : comparison.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
          <p className="text-[10px] uppercase font-black text-slate-700 tracking-[0.3em]">No localized price data available yet</p>
          <p className="text-[9px] text-slate-800 uppercase font-black mt-2">Drivers are constantly updating intelligence</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">
            Verified prices across nearby stores:
          </p>
          <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {comparison.map((entry, index) => (
              <div 
                key={index}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-ninpo-lime/30 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-white font-black text-sm uppercase group-hover:text-ninpo-lime transition-colors">
                      {entry.storeName}
                    </h4>
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase">
                      <MapPin className="w-3 h-3" />
                      {entry.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-ninpo-lime tracking-tighter">
                      ${entry.price.toFixed(2)}
                      {entry.isDeposit && <span className="text-[10px] ml-1 opacity-50">+DEP</span>}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[8px] font-black text-slate-600 uppercase">
                      <Clock className="w-2 h-2" />
                      {new Date(entry.lastVerified).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-ninpo-lime/5 border border-ninpo-lime/20 rounded-2xl p-4 mt-6">
            <p className="text-[9px] font-black text-ninpo-lime uppercase tracking-widest flex items-center gap-2 text-center justify-center">
              Verified by Ninpo Logistics Drivers
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMarketIntelligence;
