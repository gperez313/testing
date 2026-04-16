import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  DollarSign,
  Clock,
  Store,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Home,
  SkipForward,
  X,
  AlertTriangle,
  Recycle
} from 'lucide-react';
import ItemNotFoundTracker from './ItemNotFoundTracker';
import ManualItemNotFoundForm from './ManualItemNotFoundForm';
import ReceiptCapture from './ReceiptCapture';
import ReceiptCaptureFlow from './ReceiptCaptureFlow';
import BottleVerificationScanner from './BottleVerificationScanner';
// import ScannerModal from './ScannerModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

interface ShoppingListItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
  store: string;
  storeId: string;
  storeAddress?: string;
}

interface NotFoundItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
  originalStore: string;
  originalStoreId?: string;
  originalStoreAddress?: string;
  attemptedStores: string[];
  attemptedStoreIds?: string[];
  attemptedStoreAddresses?: string[];
  foundAt?: string;
  foundAtId?: string;
  foundAtAddress?: string;
}

interface OrderDetail {
  orderId: string;
  customerId: string;
  address: string;
  total: number;
  status: string;
  items: any[];
  routeFee: number;
  distanceFee: number;
  largeOrderFee: number;
  heavyItemFee: number;
  returnUpcCounts?: Array<{ upc: string; quantity: number }>;
  returnPayoutMethod?: 'CREDIT' | 'CASH';
  estimatedReturnCredit?: number;
  verifiedReturnCredit?: number;
  driverId?: string;
  assignedAt?: string;
  createdAt: string;
}

interface DriverOrderDetailProps {
  order: OrderDetail;
  onBack: () => void;
}

const DriverOrderDetail: React.FC<DriverOrderDetailProps> = ({ order, onBack }) => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [notFoundItems, setNotFoundItems] = useState<NotFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedByStore, setGroupedByStore] = useState<Record<string, ShoppingListItem[]>>({});
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [_syncError, _setSyncError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [showReceiptCapture, setShowReceiptCapture] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showManualReport, setShowManualReport] = useState(false);
  const [showBottleVerification, setShowBottleVerification] = useState(false);
  const [storeMissions, setStoreMissions] = useState<any[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };


  // Use ReceiptCaptureFlow for all receipt capture/parse

  const fetchStoreMissions = useCallback(async (storeId: string) => {
    try {
      setLoadingMissions(true);
      const res = await fetch(`${BACKEND_URL}/api/driver/missions?storeId=${storeId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setStoreMissions(data.missions || []);
      }
    } catch (err) {
      console.warn('Failed to fetch store missions:', err);
    } finally {
      setLoadingMissions(false);
    }
  }, []);

  useEffect(() => {
    if (currentStoreId) {
      fetchStoreMissions(currentStoreId);
    }
  }, [currentStoreId, fetchStoreMissions]);

  const fetchNotFoundItemsFromBackend = useCallback(async () => {
    try {
      const orderId = order?.orderId || (order as any)?.id;
      const storageKey = `notFoundItems_${orderId}`;
      const token = localStorage.getItem('token');

      // Load local first (for immediate UI), then merge with backend
      const localRaw = localStorage.getItem(storageKey);
      const localItems: NotFoundItem[] = localRaw ? JSON.parse(localRaw) : [];
      if (localItems.length > 0) {
        setNotFoundItems(localItems);
      }

      const res = await fetch(`${BACKEND_URL}/api/driver/order/${orderId}/items-not-found`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        // Keep local data and surface a warning
        showToast('Failed to refresh not-found items from server', 'error');
        return;
      }
      const data = await res.json();
      const serverItems: NotFoundItem[] = Array.isArray(data.itemsNotFound)
        ? data.itemsNotFound
        : [];

      // Merge: prefer local entries on conflict (offline-first), include new server items
      const bySku = new Map<string, NotFoundItem>();
      for (const it of serverItems) bySku.set(it.sku, it);
      for (const it of localItems) bySku.set(it.sku, it);
      const merged = Array.from(bySku.values());

      setNotFoundItems(merged);
      localStorage.setItem(storageKey, JSON.stringify(merged));

      // Push merged state back to server to reconcile
      try {
        await fetch(`${BACKEND_URL}/api/driver/order/${orderId}/items-not-found`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ items: merged })
        });
      } catch (e) {
        // Non-fatal: retain local cache
        console.warn('Post-merge sync failed:', e);
      }
    } catch (err) {
      console.warn('Failed to fetch not-found items from backend:', err);
      // Fallback to local-only load
      loadNotFoundItemsFromStorage();
    }
  }, [order, loadNotFoundItemsFromStorage]);

  const fetchShoppingList = useCallback(async () => {
    try {
      setLoading(true);
      const orderId = order?.orderId || (order as any)?.id;
      const token = localStorage.getItem('token');
      const resp = await fetch(`${BACKEND_URL}/api/driver/shopping-list?orderId=${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Failed to fetch shopping list');
      const data = await resp.json();
      setShoppingList(data.items || []);
      
      const grouped: Record<string, ShoppingListItem[]> = {};
      (data.items || []).forEach((item: ShoppingListItem) => {
        if (!grouped[item.storeId]) grouped[item.storeId] = [];
        grouped[item.storeId].push(item);
      });
      setGroupedByStore(grouped);
      if (Object.keys(grouped).length > 0 && !currentStoreId) {
        setCurrentStoreId(Object.keys(grouped)[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [order, currentStoreId]);

  useEffect(() => {
    fetchShoppingList();
    fetchNotFoundItemsFromBackend();
  }, [fetchShoppingList, fetchNotFoundItemsFromBackend]);

  // Periodic backend refresh for items-not-found while view is open
  useEffect(() => {
    const id = setInterval(() => {
      fetchNotFoundItemsFromBackend();
    }, 30000);
    return () => clearInterval(id);
  }, [fetchNotFoundItemsFromBackend]);

  const handleItemNotFound = (item: ShoppingListItem, storeId: string) => {
    const existing = notFoundItems.find(n => n.sku === item.sku);
    const storeData = groupedByStore[storeId]?.[0];
    const storeName = storeData?.store || `Store ${storeId}`;
    const storeAddress = storeData?.storeAddress || item.storeAddress || '';
    
    let updated: NotFoundItem[];
    if (existing) {
      if (!existing.attemptedStores.includes(storeName)) {
        updated = notFoundItems.map(n =>
          n.sku === item.sku
            ? { 
                ...n, 
                attemptedStores: [...n.attemptedStores, storeName],
                attemptedStoreIds: [...(n.attemptedStoreIds || []), storeId],
                attemptedStoreAddresses: [...(n.attemptedStoreAddresses || []), storeAddress]
              }
            : n
        );
      } else {
        return;
      }
    } else {
      updated = [
        ...notFoundItems,
        {
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          originalStore: storeName,
          originalStoreId: storeId,
          originalStoreAddress: storeAddress,
          attemptedStores: [storeName],
          attemptedStoreIds: [storeId],
          attemptedStoreAddresses: [storeAddress]
        }
      ];
    }
    setNotFoundItems(updated);
    saveNotFoundItemsToStorage(updated);
  };

  const handleUpdateNotFound = (item: NotFoundItem) => {
    const updated = notFoundItems.map(n => (n.sku === item.sku ? item : n));
    setNotFoundItems(updated);
    saveNotFoundItemsToStorage(updated);
  };

  const handleMarkFoundAt = async (sku: string, storeName: string) => {
    const orderId = order?.orderId || order?.id;
    const token = localStorage.getItem('token');
    const existing = notFoundItems.find(n => n.sku === sku);
    if (!existing) return;

    // Find store details if possible
    let storeId = '';
    let storeAddress = '';
    for (const sId in groupedByStore) {
      if (groupedByStore[sId][0]?.store === storeName) {
        storeId = sId;
        storeAddress = groupedByStore[sId][0]?.storeAddress || '';
        break;
      }
    }

    const attempted = existing.attemptedStores.includes(storeName)
      ? existing.attemptedStores
      : [...existing.attemptedStores, storeName];
    
    const attemptedIds = existing.attemptedStoreIds?.includes(storeId)
      ? existing.attemptedStoreIds
      : [...(existing.attemptedStoreIds || []), storeId];

    const attemptedAddresses = existing.attemptedStoreAddresses?.includes(storeAddress)
      ? existing.attemptedStoreAddresses
      : [...(existing.attemptedStoreAddresses || []), storeAddress];

    const updatedItem: NotFoundItem = { 
      ...existing, 
      foundAt: storeName, 
      foundAtId: storeId,
      foundAtAddress: storeAddress,
      attemptedStores: attempted,
      attemptedStoreIds: attemptedIds,
      attemptedStoreAddresses: attemptedAddresses
    };
    const updated = notFoundItems.map(n => (n.sku === sku ? updatedItem : n));
    setNotFoundItems(updated);
    saveNotFoundItemsToStorage(updated);
    try {
      await fetch(`${BACKEND_URL}/api/driver/order/${orderId}/items-not-found/${encodeURIComponent(sku)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: 'found', 
          foundAt: storeName,
          foundAtId: storeId,
          foundAtAddress: storeAddress
        })
      });
    } catch (e) {
      console.warn('Failed to mark found on server:', e);
      showToast('Could not sync found item to server', 'error');
    }
  };

  const handleRemoveNotFound = (sku: string) => {
    const updated = notFoundItems.filter(n => n.sku !== sku);
    setNotFoundItems(updated);
    saveNotFoundItemsToStorage(updated);
  };

  const getStoreNameFromId = (storeId: string): string => {
    const items = groupedByStore[storeId];
    if (items && items.length > 0) {
      return items[0].store || `Store ${storeId}`;
    }
    return `Store ${storeId}`;
  };

  const loadNotFoundItemsFromStorage = useCallback(() => {
    try {
      const orderId = order?.orderId || order?.id;
      const storageKey = `notFoundItems_${orderId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setNotFoundItems(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Failed to load items from storage:', err);
    }
  }, [order?.id, order?.orderId]);

  const saveNotFoundItemsToStorage = async (items: NotFoundItem[]) => {
    try {
      const orderId = order?.orderId || order?.id;
      const storageKey = `notFoundItems_${orderId}`;
      localStorage.setItem(storageKey, JSON.stringify(items));

      // Sync to backend
      const token = localStorage.getItem('token');
      await fetch(`${BACKEND_URL}/api/driver/order/${orderId}/items-not-found`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      }).catch(err => console.warn('Backend sync failed:', err));
    } catch (err) {
      showToast('Failed to sync items not found', 'error');
      console.error(err);
    }
  };

  const getTotalItems = () => shoppingList.reduce((sum, item) => sum + item.quantity, 0);
  
  const getSubtotal = () => shoppingList.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const getStoreName = (storeId: string) => {
    // Extract store name from grouped data or use ID
    const items = groupedByStore[storeId];
    if (items && items.length > 0) {
      return items[0].store || `Store ${storeId}`;
    }
    return `Store ${storeId}`;
  };

  const totalFees = (order?.routeFee || 0) + (order?.distanceFee || 0) + (order?.largeOrderFee || 0) + (order?.heavyItemFee || 0);

  const handleVerifyBottles = async (verifiedUpcs: any[], verifiedCount: number, verifiedAmount: number) => {
    try {
      const orderId = order?.orderId || (order as any)?.id;
      const token = localStorage.getItem('token');
      
      // 1. Create a bottle return record
      const res = await fetch(`${BACKEND_URL}/api/bottle-returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          claimedUpcs: verifiedUpcs,
          estimatedAmount: verifiedAmount,
          type: order.returnPayoutMethod || 'CREDIT'
        })
      });

      if (!res.ok) throw new Error('Failed to create bottle return record');
      const bottleReturn = await res.json();

      // 2. Verify it immediately (driver flow)
      await fetch(`${BACKEND_URL}/api/bottle-returns/${bottleReturn._id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          verifiedUpcs,
          verifiedCount,
          verifiedAmount,
          notes: 'Verified at delivery'
        })
      });

      // 3. Redeem it (finalize)
      await fetch(`${BACKEND_URL}/api/bottle-returns/${bottleReturn._id}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      showToast(`Verified ${verifiedCount} bottles. Credit: $${verifiedAmount.toFixed(2)}`, 'success');
      setShowBottleVerification(false);
      fetchShoppingList(); // Refresh
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-ninpo-black text-white overflow-y-auto z-40">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pt-4 sticky top-0 bg-ninpo-black z-10">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-ninpo-lime">Order Details</h1>
            <p className="text-white/60">{order?.orderId?.slice(0, 12)}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-xl text-red-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px] ${
            toast.type === 'error' 
              ? 'bg-red-900/95 border border-red-600 text-red-200'
              : toast.type === 'success'
              ? 'bg-green-900/95 border border-green-600 text-green-200'
              : 'bg-blue-900/95 border border-blue-600 text-blue-200'
          }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-bold">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/10 rounded transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-white/60 uppercase font-bold mb-1">Order Total</p>
              <p className="text-3xl font-black text-ninpo-lime">${order?.total?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase font-bold mb-1">Items</p>
              <p className="text-3xl font-black text-white">{getTotalItems()}</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Delivery Address */}
            <div className="flex items-start gap-3">
              <Home className="w-5 h-5 text-ninpo-lime mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-white/60 uppercase font-bold">Delivery Address</p>
                <p className="text-sm">{order?.address}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-ninpo-lime mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-white/60 uppercase font-bold">Status</p>
                <p className="text-sm capitalize">{order?.status?.toLowerCase().replace(/_/g, ' ')}</p>
              </div>
            </div>

            {/* Time */}
            {order?.assignedAt && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-ninpo-lime mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-white/60 uppercase font-bold">Assigned</p>
                  <p className="text-sm">
                    {new Date(order.assignedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-black text-ninpo-lime mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Fee Breakdown
          </h2>
          <div className="space-y-2 text-sm">
            {order?.routeFee > 0 && (
              <div className="flex justify-between">
                <span className="text-white/70">Route Fee</span>
                <span className="font-bold">${order.routeFee.toFixed(2)}</span>
              </div>
            )}
            {order?.distanceFee > 0 && (
              <div className="flex justify-between">
                <span className="text-white/70">Distance Fee</span>
                <span className="font-bold">${order.distanceFee.toFixed(2)}</span>
              </div>
            )}
            {order?.largeOrderFee > 0 && (
              <div className="flex justify-between">
                <span className="text-white/70">Large Order Fee</span>
                <span className="font-bold">${order.largeOrderFee.toFixed(2)}</span>
              </div>
            )}
            {order?.heavyItemFee > 0 && (
              <div className="flex justify-between">
                <span className="text-white/70">Heavy Item Fee</span>
                <span className="font-bold">${order.heavyItemFee.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-black">
              <span>Total Fees</span>
              <span className="text-ninpo-lime">${totalFees.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bottle Returns Section */}
        {order?.returnUpcCounts && order.returnUpcCounts.length > 0 && (
          <div className="bg-ninpo-lime/10 border border-ninpo-lime/30 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-ninpo-lime flex items-center gap-2">
                <Recycle className="w-5 h-5" />
                Bottle Returns
              </h2>
              <span className="bg-ninpo-lime text-ninpo-black text-[10px] font-black px-2 py-1 rounded-md uppercase">
                {order.returnPayoutMethod}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              {order.returnUpcCounts.map((u, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white/70">{u.upc}</span>
                  <span className="font-bold">x{u.quantity}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-ninpo-lime/20">
              <div>
                <p className="text-[10px] text-white/50 uppercase font-bold">Estimated Credit</p>
                <p className="text-xl font-black text-ninpo-lime">${order.estimatedReturnCredit?.toFixed(2)}</p>
              </div>
              <button
                onClick={() => setShowBottleVerification(true)}
                className="px-6 py-3 bg-ninpo-lime text-ninpo-black rounded-xl font-black uppercase tracking-widest text-xs shadow-neon"
              >
                Verify Bottles
              </button>
            </div>
          </div>
        )}

        {/* Shopping List by Store Section */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-ninpo-lime" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Items Not Found Tracker */}
            <ItemNotFoundTracker
              orderId={order?.orderId || order?.id || ''}
              notFoundItems={notFoundItems}
              onItemNotFound={handleUpdateNotFound}
              onRemoveNotFound={handleRemoveNotFound}
              currentStore={currentStoreId ? getStoreNameFromId(currentStoreId) : 'N/A'}
              availableStores={Object.entries(groupedByStore).map(([id, items]) => ({
                id,
                name: items[0]?.store || `Store ${id}`
              }))}
              onMarkFound={(sku, store) => handleMarkFoundAt(sku, store)}
            />

            {/* Shopping List by Store */}
            {(Object.entries(groupedByStore) as Array<[string, ShoppingListItem[]]>).map(([storeId, storeItems]) => (
              <div
                key={storeId}
                className={`bg-white/5 border rounded-xl p-6 cursor-pointer transition-all ${
                  currentStoreId === storeId
                    ? 'border-ninpo-lime/50 bg-ninpo-lime/10'
                    : 'border-white/10 hover:border-ninpo-lime/30'
                }`}
                onClick={() => setCurrentStoreId(storeId)}
              >
                <h3 className="text-lg font-black text-ninpo-lime mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    {getStoreName(storeId)}
                  </div>
                  {currentStoreId === storeId && storeMissions.length > 0 && (
                     <div className="flex items-center gap-1 bg-ninpo-lime text-ninpo-black text-[8px] px-2 py-0.5 rounded-full animate-pulse">
                        <Zap className="w-2 h-2" /> {storeMissions.length} MISSIONS
                     </div>
                  )}
                </h3>

                {currentStoreId === storeId && (loadingMissions || storeMissions.length > 0) && (
                  <div className="mb-6 bg-ninpo-lime/5 border border-ninpo-lime/20 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black text-ninpo-lime uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-3 h-3" /> While You're Here (Bounty Tasks)
                    </p>
                    {loadingMissions ? (
                       <div className="flex items-center gap-2 py-2">
                          <Loader2 className="w-3 h-3 animate-spin text-ninpo-lime" />
                          <span className="text-[8px] font-black text-slate-500 uppercase">Scanning for high-value price gaps...</span>
                       </div>
                    ) : (
                      <div className="space-y-2">
                        {storeMissions.slice(0, 3).map((mission) => (
                          <div key={mission.id} className="flex items-center justify-between p-2 bg-ninpo-lime/10 rounded-xl border border-ninpo-lime/10">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-white uppercase truncate">{mission.productName}</p>
                                <p className="text-[8px] font-bold text-slate-500 uppercase">Stale for {Math.floor((Date.now() - new Date(mission.lastObserved).getTime()) / (1000 * 60 * 60 * 24))}d</p>
                            </div>
                            <div className="text-[10px] font-black text-ninpo-lime ml-4 whitespace-nowrap">
                                +{mission.bountyPoints} PTS
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {storeItems.map((item: ShoppingListItem, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-xs text-white/50">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right mr-3">
                        <p className="text-sm font-bold text-ninpo-lime">
                          x{item.quantity}
                        </p>
                        <p className="text-xs text-white/60">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleItemNotFound(item, storeId)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white/70 hover:text-white"
                        title="Mark as not found"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                  <span className="font-bold text-white/70">Store Subtotal</span>
                  <span className="font-black text-ninpo-lime">
                    ${storeItems.reduce((sum: number, item: ShoppingListItem) => sum + (item.price * item.quantity), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            {/* Total Summary */}
            <div className="bg-gradient-to-br from-ninpo-lime/20 to-ninpo-lime/5 border border-ninpo-lime/30 rounded-xl p-6">
              <div className="space-y-2">
                <div className="flex justify-between text-white/70">
                  <span>Items Subtotal</span>
                  <span>${getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Delivery Fees</span>
                  <span>${totalFees.toFixed(2)}</span>
                </div>
                <div className="border-t border-ninpo-lime/20 pt-2 mt-2 flex justify-between font-black text-lg">
                  <span>Order Total</span>
                  <span className="text-ninpo-lime">${order?.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowPhotoCapture(true)}
              className="py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-sm"
            >
              <DollarSign className="w-5 h-5" />
              Auto Receipt
            </button>
            <button
              onClick={() => setShowReceiptCapture(true)}
              className="py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-sm"
            >
              <DollarSign className="w-5 h-5" />
              Manual Entry
            </button>
          </div>
      <div className="flex gap-3">
            <button
              onClick={() => setShowManualReport(true)}
              className="flex-1 py-3 bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-sm"
            >
              <AlertTriangle className="w-5 h-5" />
              Report Missing
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black uppercase tracking-widest transition-all"
            >
              Close
            </button>
            <button
              onClick={fetchShoppingList}
              disabled={loading}
              className="flex-1 py-3 bg-ninpo-lime text-ninpo-black hover:bg-white rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>


        {/* Canonical Receipt Capture Flow */}
        {showPhotoCapture && (
          <ReceiptCaptureFlow
            stores={[]}
            isOpen={showPhotoCapture}
            defaultStoreId={currentStoreId || undefined}
            onReceiptCreated={() => {
              setShowPhotoCapture(false);
              showToast('Receipt auto-uploaded & parse started! Check management to review.', 'success');
            }}
            onCancel={() => setShowPhotoCapture(false)}
          />
        )}

        {/* Manual Receipt Entry Modal */}
        {showReceiptCapture && (
          <ReceiptCapture
            orderId={order?.orderId || order?.id || ''}
            storeId={currentStoreId || undefined}
            storeName={currentStoreId ? getStoreNameFromId(currentStoreId) : undefined}
            onComplete={() => {
              setShowReceiptCapture(false);
              showToast('Prices updated from receipt!', 'success');
            }}
            onCancel={() => setShowReceiptCapture(false)}
          />
        )}

        {/* Manual Item Not Found Form */}
        {showManualReport && (
          <ManualItemNotFoundForm
            isOpen={showManualReport}
            onClose={() => setShowManualReport(false)}
            currentStoreId={currentStoreId || undefined}
            availableStores={Object.entries(groupedByStore).map(([id, items]) => ({
              id,
              name: items[0]?.store || `Store ${id}`,
              address: items[0]?.storeAddress || ''
            }))}
            onSubmit={(item) => {
              handleItemNotFound(item as any, item.storeId);
              showToast(`Reported ${item.name} as missing`, 'success');
            }}
          />
        )}

        {/* Bottle Verification Scanner */}
        {showBottleVerification && order.returnUpcCounts && (
          <BottleVerificationScanner
            claimedUpcs={order.returnUpcCounts}
            onVerify={handleVerifyBottles}
            onCancel={() => setShowBottleVerification(false)}
          />
        )}
      </div>
    </div>
  );
};

export default DriverOrderDetail;
