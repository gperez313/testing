import React, { useState } from 'react';
import { X, AlertCircle, Plus } from 'lucide-react';

interface ManualItemNotFoundFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: { sku: string; name: string; quantity: number; price: number; store: string; storeId: string; storeAddress: string }) => void;
  availableStores: Array<{ id: string; name: string; address?: string }>;
  currentStoreId?: string;
}

const ManualItemNotFoundForm: React.FC<ManualItemNotFoundFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableStores,
  currentStoreId
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [storeId, setStoreId] = useState(currentStoreId || (availableStores[0]?.id || ''));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedStore = availableStores.find(s => s.id === storeId);
    onSubmit({
      sku,
      name,
      quantity,
      price,
      storeId,
      store: selectedStore?.name || 'Unknown Store',
      storeAddress: selectedStore?.address || ''
    });
    // Reset form
    setSku('');
    setName('');
    setQuantity(1);
    setPrice(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-ninpo-black border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ninpo-lime/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-ninpo-lime" />
            </div>
            <h2 className="text-xl font-black text-white">Report Missing Item</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/60 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase mb-1.5 ml-1">
              Item Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coca Cola 12pk"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-ninpo-lime/50 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase mb-1.5 ml-1">
                SKU / UPC
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU-123"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-ninpo-lime/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase mb-1.5 ml-1">
                Store
              </label>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-ninpo-lime/50 transition-all appearance-none"
              >
                {availableStores.map(store => (
                  <option key={store.id} value={store.id} className="bg-ninpo-black">
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase mb-1.5 ml-1">
                Quantity
              </label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-ninpo-lime/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase mb-1.5 ml-1">
                Est. Price
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-ninpo-lime/50 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase tracking-widest transition-all text-white/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 py-4 bg-ninpo-lime text-ninpo-black hover:bg-white rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Report Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualItemNotFoundForm;
