import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Calendar,
  Package,
  Zap
} from 'lucide-react';
import { BACKEND_URL } from '../constants';

interface EarningsData {
  deliveries: number;
  routeFees: number;
  distanceFees: number;
  totalFees: number;
  totalDistance: number;
}

interface PerformanceData {
  totalOrders: number;
  completedOrders: number;
  completionRate: number;
  avgCompletionTimeMinutes: number;
  totalDeliveries: number;
  totalDistance: number;
  avgDeliveryDistance: number;
}

interface DriverDashboardProps {
  _onSelectOrder: (orderId: string) => void;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ _onSelectOrder }) => {
  const [earnings, setEarnings] = useState<{
    today: EarningsData;
    week: EarningsData;
    month: EarningsData;
  } | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [priceStats, setPriceStats] = useState<{ totalContributions: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [earningsRes, performanceRes, ordersRes, priceRes, leaderboardRes, missionsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/driver/earnings`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/driver/performance`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/driver/orders?limit=5`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/driver/price-intelligence-stats`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/driver/leaderboard`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/driver/missions`, { credentials: 'include' })
        ]);

        if (!earningsRes.ok || !performanceRes.ok || !ordersRes.ok || !priceRes.ok || !leaderboardRes.ok || !missionsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const earningsData = await earningsRes.json();
        const performanceData = await performanceRes.json();
        const ordersData = await ordersRes.json();
        const priceData = await priceRes.json();
        const lbData = await leaderboardRes.json();
        const mData = await missionsRes.json();

        setEarnings(earningsData);
        setPerformance(performanceData.thirtyDayStats);
        setRecentOrders(ordersData.orders || []);
        setPriceStats(priceData);
        setLeaderboard(lbData.leaderboard || []);
        setMissions(mData.missions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const money = (n: number) => `$${n.toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-ninpo-lime/20 border-t-ninpo-lime animate-spin" />
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Syncing Driver Data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-ninpo-red/10 border border-ninpo-red/20 rounded-[2.5rem] text-center">
        <AlertCircle className="w-12 h-12 text-ninpo-red mx-auto mb-4" />
        <h3 className="text-white font-black uppercase mb-2">Dashboard Error</h3>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-24 h-24 text-ninpo-lime" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Today's Earnings</p>
          <h4 className="text-4xl font-black text-white tracking-tighter mb-4">
            {money(earnings?.today.totalFees || 0)}
          </h4>
          <div className="flex items-center gap-2 text-[10px] font-black text-ninpo-lime uppercase">
            <TrendingUp className="w-3 h-3" />
            {earnings?.today.deliveries} Deliveries Completed
          </div>
        </div>

        <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-24 h-24 text-blue-400" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg. Delivery Time</p>
          <h4 className="text-4xl font-black text-white tracking-tighter mb-4">
            {performance?.avgCompletionTimeMinutes || 0}m
          </h4>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
            Last 30 Days Average
          </p>
        </div>

        <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <MapPin className="w-24 h-24 text-purple-400" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Distance Covered</p>
          <h4 className="text-4xl font-black text-white tracking-tighter mb-4">
            {(earnings?.today.totalDistance || 0).toFixed(1)}mi
          </h4>
          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
            Total Miles Driven Today
          </p>
        </div>

        <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-24 h-24 text-ninpo-lime" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Price Intelligence</p>
          <h4 className="text-4xl font-black text-white tracking-tighter mb-4">
            {priceStats?.totalContributions || 0}
          </h4>
          <p className="text-[10px] font-black text-ninpo-lime uppercase tracking-widest">
            Verified Price Contributions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Earnings Breakdown */}
        <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-ninpo-lime" /> Earnings Breakdown
            </h3>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-4">
            {[
              { label: 'Today', data: earnings?.today },
              { label: 'This Week', data: earnings?.week },
              { label: 'This Month', data: earnings?.month }
            ].map((period) => (
              <div key={period.label} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{period.label}</p>
                  <p className="text-lg font-black text-white">{money(period.data?.totalFees || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deliveries</p>
                  <p className="text-sm font-black text-ninpo-lime">{period.data?.deliveries || 0}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <h3 className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-ninpo-lime" /> Performance (30D)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Completion Rate</p>
              <p className="text-xl font-black text-white">{((performance?.completionRate || 0) * 100).toFixed(0)}%</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Deliveries</p>
              <p className="text-xl font-black text-white">{performance?.totalDeliveries || 0}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Distance</p>
              <p className="text-xl font-black text-white">{(performance?.totalDistance || 0).toFixed(1)}mi</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg. Distance</p>
              <p className="text-xl font-black text-white">{(performance?.avgDeliveryDistance || 0).toFixed(1)}mi</p>
            </div>
          </div>

          <div className="pt-4">
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-ninpo-lime h-full transition-all duration-1000" 
                style={{ width: `${(performance?.completionRate || 0) * 100}%` }}
              />
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2 text-center">
              Target Completion: 95%
            </p>
          </div>
        </div>
      </div>

      {/* Driver Missions */}
      <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-3">
            <Zap className="w-4 h-4 text-ninpo-lime" /> Intelligence Missions
          </h3>
          <span className="px-3 py-1 bg-ninpo-lime/10 border border-ninpo-lime/20 rounded-full text-[9px] font-black text-ninpo-lime uppercase tracking-widest">
            {missions.length} Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missions.length === 0 ? (
            <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-3xl">
              <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest">Local markets are up to date</p>
            </div>
          ) : (
            missions.map((mission) => (
              <div key={mission.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-ninpo-lime/30 transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-xl bg-ninpo-lime/10 flex items-center justify-center text-ninpo-lime">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="bg-ninpo-lime text-ninpo-black font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest shadow-neon">
                    +{mission.bountyPoints} PTS
                  </div>
                </div>
                <h4 className="text-white font-black text-xs uppercase mb-1 truncate">{mission.productName}</h4>
                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mb-3 truncate">{mission.storeName}</p>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                    Stale for {Math.floor((Date.now() - new Date(mission.lastObserved).getTime()) / (1000 * 60 * 60 * 24))}d
                  </span>
                  <button className="text-[9px] font-black text-ninpo-lime hover:text-white uppercase tracking-widest transition-colors">
                    Upload Receipt
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity and Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <h3 className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-3">
            <Clock className="w-4 h-4 text-ninpo-lime" /> Recent Activity
          </h3>

          {recentOrders.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl">
              <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest">No recent activity found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => _onSelectOrder(order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      order.status === 'DELIVERED' ? 'bg-ninpo-lime/20 text-ninpo-lime' : 'bg-blue-400/20 text-blue-400'
                    }`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order #{order.id.slice(-6)}</p>
                      <p className="text-sm font-black text-white">{order.address?.split(',')[0] || 'Unknown Address'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{order.status}</p>
                    <p className="text-xs font-black text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <h3 className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-ninpo-lime" /> Intelligence Leaderboard
          </h3>

          <div className="space-y-4">
            {leaderboard.length === 0 ? (
               <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl">
                <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest">Collecting Intelligence...</p>
               </div>
            ) : (
              leaderboard.map((item) => (
                <div key={item.driverId} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                      item.rank === 1 ? 'bg-ninpo-lime text-ninpo-black shadow-neon' : 'bg-white/10 text-white'
                    }`}>
                      #{item.rank}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver ID</p>
                      <p className="text-xs font-black text-white">{item.driverId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-ninpo-lime tracking-tighter">{item.contributions}</p>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Contributions</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
