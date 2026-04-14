
interface CustomerViewProps {
  products: Product[];
  orders: Order[];
  currentUser: User | null;
  userStats?: UserStatsSummary;
  address: string;
  onAddressChange: (_: string) => void;
  openLogin: () => void;
  onRequestRefund: (_: string) => void;
  addToCart: (_: string) => void;
  updateUserProfile: (_: Partial<User>) => void;
  reorderItems: (_: { productId: string; quantity: number }[]) => void;
  onRedeemPoints: (_: number) => void;
  onPayExternal: (_: 'STRIPE' | 'GPAY', __: ReturnUpcCount[], ___: 'CREDIT' | 'CASH') => Promise<void>;
  onPayCredits: (_: ReturnUpcCount[], __: 'CREDIT' | 'CASH') => Promise<boolean>;
}

import React, { useState, useEffect } from 'react';
import { Product, Order, OrderStatus, User, UserTier, UserStatsSummary } from '../types';
import { Plus, Settings, Leaf, Star, Coins, Zap, Info, CheckCircle2, XCircle, Recycle } from 'lucide-react';
import { CATEGORIES } from '../constants';
import CustomerReturnScanner from '../components/CustomerReturnScanner';
import { analytics } from '../services/analyticsService';
import AssistantSearchChat from '../components/AssistantSearchChat';



import OrderTrackingMap from '../components/OrderTrackingMap';

const CustomerView: React.FC<CustomerViewProps> = ({
  products,
  orders,
  currentUser,
  addToCart,
  userStats,
  address,
  onAddressChange,
  onPayExternal,
}) => {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiFilteredIds, setAiFilteredIds] = useState<string[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showReturnScanner, setShowReturnScanner] = useState(false);
  const [totalReturnContainers, setTotalReturnContainers] = useState(0);
  const [estimatedReturnCredit, setEstimatedReturnCredit] = useState(0);
  const [scannedReturnUpcs, setScannedReturnUpcs] = useState<ReturnUpcCount[]>([]);
  const [payoutMethod, setPayoutMethod] = useState<'CREDIT' | 'CASH'>('CREDIT');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [showPayoutSelection, setShowPayoutSelection] = useState(false);

  const activeOrders = orders.filter(o => 
    !['DELIVERED', 'REFUNDED', 'CLOSED'].includes(o.status)
  );

  // Lifetime bottle returns state
  const [lifetimeBottleReturns, setLifetimeBottleReturns] = useState<number | null>(null);
  const [bottleReturnsLoading, setBottleReturnsLoading] = useState(false);
  const [bottleReturnsError, setBottleReturnsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBottleReturns = async () => {
      if (!currentUser) return;
      setBottleReturnsLoading(true);
      setBottleReturnsError(null);
      try {
        const res = await fetch(`/server/users/${currentUser.id}/bottle-returns`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setLifetimeBottleReturns(data.lifetimeBottleReturns ?? 0);
      } catch (err: any) {
        setBottleReturnsError('Could not load bottle returns');
        setLifetimeBottleReturns(null);
      } finally {
        setBottleReturnsLoading(false);
      }
    };
    fetchBottleReturns();
  }, [currentUser]);

  // Filtering and derived values
  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'ALL' || p.category.toUpperCase() === activeCategory;
    const matchesText = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAi = aiFilteredIds.length === 0 || aiFilteredIds.includes(p._id || (p as any).frontendId);
    return matchesCategory && matchesText && matchesAi;
  });

  // Safe numeric defaults
  const safeCredits = currentUser?.creditBalance ?? 0;
  const safeLoyaltyPoints = currentUser?.loyaltyPoints ?? 0;

  // Checklist progress logic (backend-aligned)
  const userTier = (currentUser?.membershipTier ?? UserTier.COMMON).toString().toUpperCase();
  const orderCount = userStats?.orderCount ?? 0;
  const totalSpend = userStats?.totalSpend ?? 0;
  const phoneVerified = !!currentUser?.phoneVerified;
  const photoIdVerified = !!currentUser?.photoIdVerified;

  // Tier requirements
  const tierRequirements = [
    {
      label: 'Bronze',
      requirements: [
        { label: '25 orders', met: orderCount >= 25, value: `${orderCount}/25` },
        { label: '$250 spent', met: totalSpend >= 250, value: `$${totalSpend.toFixed(2)}/$250.00` },
        { label: 'Email verified', met: true, value: '✓' }, // always true (implicit)
      ],
      achieved: userTier === 'BRONZE' || userTier === 'SILVER' || userTier === 'GOLD' || userTier === 'PLATINUM',
    },
    {
      label: 'Silver',
      requirements: [
        { label: '50 orders', met: orderCount >= 50, value: `${orderCount}/50` },
        { label: '$600 spent', met: totalSpend >= 600, value: `$${totalSpend.toFixed(2)}/$600.00` },
        { label: 'Phone verified', met: phoneVerified, value: phoneVerified ? '✓' : '✗' },
      ],
      achieved: userTier === 'SILVER' || userTier === 'GOLD' || userTier === 'PLATINUM',
    },
    {
      label: 'Gold',
      requirements: [
        { label: '100 orders', met: orderCount >= 100, value: `${orderCount}/100` },
        { label: '$1500 spent', met: totalSpend >= 1500, value: `$${totalSpend.toFixed(2)}/$1500.00` },
        { label: 'Photo ID verified', met: photoIdVerified, value: photoIdVerified ? '✓' : '✗' },
      ],
      achieved: userTier === 'GOLD' || userTier === 'PLATINUM',
    },
    {
      label: 'Platinum',
      requirements: [
        { label: 'Owner-assigned', met: userTier === 'PLATINUM', value: userTier === 'PLATINUM' ? '✓' : '✗' },
      ],
      achieved: userTier === 'PLATINUM',
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col xl:flex-row gap-8 items-center justify-between">
        <div className="flex-1 w-full lg:max-w-3xl">
          <AssistantSearchChat
            products={products}
            currentUser={currentUser}
            recentOrders={orders}
            onSearchResults={(ids, interpretation) => {
              setAiFilteredIds(ids || []);
              setAiInterpretation(interpretation || '');
              setActiveCategory('ALL');
              if (!ids || ids.length === 0) {
                setSearchQuery('');
              }
            }}
            onOpenReturnScanner={() => {
              setShowReturnScanner(true);
              setShowDashboard(false);
            }}
            onOpenRecommendations={() => {
              // Scroll to recommendations section or open them
              const detailsEl = document.querySelector('details');
              if (detailsEl) {
                detailsEl.setAttribute('open', '');
              }
            }}
          />
        </div>
        <div className="flex gap-4">
          {currentUser && (
            <button
              onClick={() => {
                setShowDashboard(!showDashboard);
                setShowReturnScanner(false);
              }}
              className="px-8 py-5 bg-ninpo-card border border-white/5 rounded-[1.5rem] text-white font-black text-[12px] uppercase tracking-widest flex items-center gap-3 hover:border-ninpo-lime/40 transition-all shadow-lg active:scale-95"
            >
              <Settings className="w-5 h-5 text-slate-600" /> Dashboard
            </button>
          )}
        </div>
      </div>
      {showReturnScanner ? (
        <>
          {/* Return Scanner View */}
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-ninpo-card border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <Recycle className="w-6 h-6 text-ninpo-lime" />
                  <h3 className="text-white font-black uppercase text-[11px] tracking-widest">
                    Total Containers Scanned
                  </h3>
                </div>
                <p className="text-white font-black text-6xl tracking-tighter">
                  {totalReturnContainers}
                </p>
              </div>

              <div className="bg-ninpo-card border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <Coins className="w-6 h-6 text-ninpo-lime" />
                  <h3 className="text-white font-black uppercase text-[11px] tracking-widest">
                    Expected Return Credit
                  </h3>
                </div>
                <p className="text-ninpo-lime font-black text-6xl tracking-tighter">
                  ${estimatedReturnCredit.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Scanner Component */}
            {!showPayoutSelection ? (
              <CustomerReturnScanner
                onChange={(totalContainers, credit) => {
                  setTotalReturnContainers(totalContainers);
                  setEstimatedReturnCredit(credit);
                }}
                onComplete={(upcs, credit) => {
                  setScannedReturnUpcs(upcs);
                  setEstimatedReturnCredit(credit);
                  setShowPayoutSelection(true);
                }}
              />
            ) : (
              <div className="bg-ninpo-card border border-white/10 rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in duration-300">
                <div className="text-center space-y-2">
                  <h3 className="text-white font-black uppercase text-xl tracking-widest">
                    Choose Payout Method
                  </h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    Select how you want to receive your ${estimatedReturnCredit.toFixed(2)} credit.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => setPayoutMethod('CREDIT')}
                    className={`p-8 rounded-[2rem] border-2 transition-all text-left space-y-4 ${
                      payoutMethod === 'CREDIT'
                        ? 'bg-ninpo-lime/10 border-ninpo-lime shadow-neon'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Coins className={`w-8 h-8 ${payoutMethod === 'CREDIT' ? 'text-ninpo-lime' : 'text-slate-600'}`} />
                      {payoutMethod === 'CREDIT' && <CheckCircle2 className="w-6 h-6 text-ninpo-lime" />}
                    </div>
                    <div>
                      <p className="text-white font-black uppercase text-sm tracking-widest">Store Credit</p>
                      <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">Full value applied to your account.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPayoutMethod('CASH')}
                    className={`p-8 rounded-[2rem] border-2 transition-all text-left space-y-4 ${
                      payoutMethod === 'CASH'
                        ? 'bg-ninpo-lime/10 border-ninpo-lime shadow-neon'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Zap className={`w-8 h-8 ${payoutMethod === 'CASH' ? 'text-ninpo-lime' : 'text-slate-600'}`} />
                      {payoutMethod === 'CASH' && <CheckCircle2 className="w-6 h-6 text-ninpo-lime" />}
                    </div>
                    <div>
                      <p className="text-white font-black uppercase text-sm tracking-widest">Cash Payout</p>
                      <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">Value minus processing fees.</p>
                    </div>
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-4">Pickup Address</span>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => onAddressChange(e.target.value)}
                      placeholder="Enter your address for pickup"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white text-sm focus:border-ninpo-lime/50 transition-all"
                    />
                  </label>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <button
                    onClick={() => setShowPayoutSelection(false)}
                    className="flex-1 py-5 bg-white/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition"
                  >
                    Back to Scan
                  </button>
                  <button
                    disabled={isSubmittingReturn || !address}
                    onClick={async () => {
                      setIsSubmittingReturn(true);
                      try {
                        // Try credits first if they have enough to cover the route fee
                        // For simplicity, we'll use the external payment flow which handles Stripe
                        await onPayExternal('STRIPE', scannedReturnUpcs, payoutMethod);
                        setShowReturnScanner(false);
                        setShowPayoutSelection(false);
                      } catch (err) {
                        console.error('Return submission failed:', err);
                      } finally {
                        setIsSubmittingReturn(false);
                      }
                    }}
                    className="flex-[2] py-5 bg-ninpo-lime text-ninpo-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-neon hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {isSubmittingReturn ? 'Processing...' : 'Submit Return Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : !showDashboard ? (
        <>
          {/* Main product/market view */}

          <div className="flex gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-1">
            {CATEGORIES.map(cat => {
              const catKey = cat.toUpperCase();
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(catKey)}
                  className={`px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all whitespace-nowrap shadow-xl ${
                    activeCategory === catKey
                      ? 'bg-ninpo-lime text-ninpo-black shadow-neon'
                      : 'bg-ninpo-card border border-white/5 text-slate-600 hover:text-white hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                className="bg-ninpo-card rounded-[3.5rem] p-6 flex flex-col border border-white/5 shadow-2xl relative group hover:border-ninpo-lime/20 transition-all duration-500"
              >
                <div className="aspect-square rounded-[2.5rem] overflow-hidden mb-6 bg-ninpo-black relative">
                  <img
                    src={p.image}
                    className={`w-full h-full object-cover grayscale transition-all duration-700 ${
                      p.stock > 0
                        ? 'group-hover:grayscale-0 group-hover:scale-110'
                        : 'opacity-20'
                    }`}
                    alt={p.name}
                  />
                  {p.isGlass && (
                    <div className="absolute top-4 right-4 bg-ninpo-black/60 backdrop-blur-md border border-white/10 p-2 rounded-xl">
                      <Leaf className="w-3 h-3 text-ninpo-lime" />
                    </div>
                  )}
                  {p.nutritionNote && (
                    <div
                      className="absolute top-4 left-4 bg-ninpo-black/60 backdrop-blur-md border border-white/10 p-2 rounded-xl"
                      title={p.nutritionNote}
                    >
                      <Info className="w-3 h-3 text-ninpo-lime" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 mb-10 px-1">
                  <h4 className="text-white font-black text-[13px] uppercase group-hover:text-ninpo-lime transition-colors leading-tight">
                    {p.name}
                  </h4>
                  <p className="text-slate-700 font-bold text-[9px] uppercase tracking-widest">
                    {p.category}
                  </p>
                </div>
                <div className="mt-auto flex justify-between items-center px-1">
                  <span className="text-ninpo-lime font-black text-lg tracking-tighter">
                    ${((p.price ?? 0) as number).toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      const productId = (p as any).frontendId || p.id || (p as any)._id;
                      addToCart(productId);
                      analytics.trackProductInteraction('add_to_cart', productId, p.name);
                    }}
                    disabled={p.stock === 0}
                    className="w-12 h-12 bg-ninpo-lime rounded-[1.2rem] flex items-center justify-center text-ninpo-black hover:bg-white active:scale-90 transition-all shadow-neon disabled:opacity-5 disabled:grayscale"
                  >
                    <Plus className="w-6 h-6 stroke-[3px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Dashboard view */}
          <div className="max-w-6xl mx-auto space-y-12 animate-in slide-in-bottom">
            
            {activeOrders.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-white font-black uppercase text-xs tracking-[0.3em] ml-4">
                  Active Deliveries
                </h3>
                {activeOrders.map(order => (
                  <OrderTrackingMap key={order.id} order={order} />
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Order History Section */}
              <div className="bg-ninpo-lime/5 p-8 rounded-[3rem] border border-ninpo-lime/20 space-y-6 flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <Coins className="w-5 h-5 text-ninpo-lime" />
                  <h3 className="text-white font-black uppercase text-[10px] tracking-[0.2em]">
                    Order History
                  </h3>
                </div>
                <div className="bg-ninpo-black/80 p-4 rounded-2xl border border-white/5 shadow-xl w-full max-h-56 overflow-y-auto min-h-[56px]">
                  {orders === undefined ? (
                    <span className="text-slate-500 text-lg">Loading...</span>
                  ) : null}
                  {orders && orders.length === 0 && (
                    <span className="text-slate-500 text-sm">No orders found.</span>
                  )}
                  {orders && orders.length > 0 && (
                    <ul className="divide-y divide-ninpo-lime/10">
                      {orders
                        .filter(o =>
                          [OrderStatus.DELIVERED, OrderStatus.REFUNDED, OrderStatus.CLOSED].includes(o.status)
                        )
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .slice(0, 10)
                        .map(o => (
                          <li key={o.id} className="py-2 flex flex-col gap-1">
                            <span className="text-white text-xs font-bold">
                              {o.address || 'No address'}
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              {new Date(o.createdAt).toLocaleDateString()} &bull; ${o.total?.toFixed(2) ?? '0.00'}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-2 text-center">
                  Most recent completed, refunded, or closed orders.
                </p>
              </div>

              {/* Lifetime Bottle Returns Section */}
              <div className="bg-ninpo-lime/5 p-8 rounded-[3rem] border border-ninpo-lime/20 space-y-6 flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <Leaf className="w-5 h-5 text-ninpo-lime" />
                  <h3 className="text-white font-black uppercase text-[10px] tracking-[0.2em]">
                    Bottle Returns (Lifetime)
                  </h3>
                </div>
                <div className="bg-ninpo-black/80 p-6 rounded-2xl border border-white/5 shadow-xl flex justify-center items-center w-full min-h-[56px]">
                  {bottleReturnsLoading ? (
                    <span className="text-slate-500 text-lg">Loading...</span>
                  ) : bottleReturnsError ? (
                    <span className="text-red-500 text-sm">{bottleReturnsError}</span>
                  ) : (
                    <span className="text-white font-black text-3xl tracking-tighter">
                      {lifetimeBottleReturns ?? 0}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-2 text-center">
                  Total containers returned and verified for deposit credit. Updated after each completed return.
                </p>
              </div>
              {/* Tier Progress Checklist Section */}
              <div className="bg-ninpo-lime/5 p-8 rounded-[3rem] border border-ninpo-lime/20 space-y-6 flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="w-5 h-5 text-ninpo-lime" />
                  <h3 className="text-white font-black uppercase text-[10px] tracking-[0.2em]">
                    Tier Progress Checklist
                  </h3>
                </div>
                <ul className="space-y-4 text-white text-sm w-full">
                  {tierRequirements.map(tier => (
                    <li key={tier.label} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${tier.achieved ? 'bg-ninpo-lime border-ninpo-lime' : 'border-slate-700'}`}>
                          {tier.achieved ? <CheckCircle2 className="w-3 h-3 text-white" /> : <XCircle className="w-3 h-3 text-slate-700" />}
                        </span>
                        <span className="font-bold uppercase tracking-widest text-xs">{tier.label} Tier</span>
                      </div>
                      <ul className="ml-6 space-y-1">
                        {tier.requirements.map(req => (
                          <li key={req.label} className="flex items-center gap-2 text-xs">
                            <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${req.met ? 'bg-ninpo-lime border-ninpo-lime' : 'border-slate-700'}`}>
                              {req.met ? <span className="block w-1.5 h-1.5 bg-white rounded-full" /> : null}
                            </span>
                            {req.label} <span className="ml-2 text-slate-400">{req.value}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
                <p className="text-slate-500 text-xs mt-2 text-center">
                  Track your progress toward higher membership tiers and rewards.
                </p>
              </div>
              {/* Credit Wallet & Loyalty Points Section */}
              <div className="bg-ninpo-card p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center items-center text-center space-y-8 shadow-2xl relative overflow-hidden group">
                <div className="w-20 h-20 bg-ninpo-lime/10 rounded-[2rem] flex items-center justify-center border border-ninpo-lime/20 shadow-neon mb-2">
                  <Coins className="w-10 h-10 text-ninpo-lime" />
                </div>
                <div>
                  <h3 className="text-slate-600 font-black uppercase text-[10px] tracking-[0.4em] mb-2">
                    Your Credits
                  </h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-2">
                    Credits are earned from verified container returns and promotions.
                  </p>
                  <p className="text-4xl font-black text-white tracking-tighter leading-none">
                    ${safeCredits.toFixed(2)}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    Credits never expire; Silver+ can cover route and distance fees, and Gold+ may request cash payouts.
                  </p>
                </div>
                <div className="mt-4">
                  <h3 className="text-slate-600 font-black uppercase text-[10px] tracking-[0.4em] mb-2">
                    Loyalty Points
                  </h3>
                  <p className="text-3xl font-black text-ninpo-lime tracking-tighter leading-none">
                    {safeLoyaltyPoints}
                  </p>
                </div>
              </div>
              {/* Add more dashboard sections here, one at a time */}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CustomerView;
