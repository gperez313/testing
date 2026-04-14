import React, { useEffect, useState } from 'react';
import { MapPin, Truck, Navigation, Package, CheckCircle2 } from 'lucide-react';
import { onDriverLocation, joinRoom } from '../services/socketService';
import { Order, OrderStatus } from '../types';

interface OrderTrackingMapProps {
  order: Order;
}

const OrderTrackingMap: React.FC<OrderTrackingMapProps> = ({ order }) => {
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!order || !['PICKED_UP', 'ARRIVING'].includes(order.status)) {
      const timer = setTimeout(() => setIsTracking(false), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setIsTracking(true), 0);
    joinRoom(`order_${order.id}`);

    const unsub = onDriverLocation((data) => {
      console.log('Received driver location for order:', order.id, data.coords);
      setDriverCoords(data.coords);
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [order]);

  const getStatusStep = () => {
    switch (order.status) {
      case OrderStatus.PAID: return 1;
      case OrderStatus.PICKED_UP: return 2;
      case OrderStatus.ARRIVING: return 3;
      case OrderStatus.DELIVERED: return 4;
      default: return 0;
    }
  };

  const currentStep = getStatusStep();

  return (
    <div className="bg-ninpo-card border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
      {/* Map Header */}
      <div className="p-8 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-ninpo-lime/10 rounded-2xl flex items-center justify-center border border-ninpo-lime/20">
            <Navigation className={`w-6 h-6 text-ninpo-lime ${isTracking ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase text-sm tracking-widest">
              Live Tracking
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {isTracking ? 'Driver is on the way' : 'Preparing your order'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-ninpo-black/50 rounded-xl border border-white/5">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-ninpo-lime animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-[9px] font-black text-white uppercase tracking-widest">
            {isTracking ? 'Live' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Visual Map Area */}
      <div className="relative h-64 bg-ninpo-black overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle, #D4FF00 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        
        {/* SVG Path */}
        <svg className="absolute inset-0 w-full h-full p-12" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M 20 80 Q 40 70 50 40 T 80 20"
            fill="none"
            stroke="#D4FF00"
            strokeWidth="0.5"
            strokeDasharray="2,2"
            className="opacity-20"
          />
          
          {/* Progress Path */}
          <path
            d="M 20 80 Q 40 70 50 40 T 80 20"
            fill="none"
            stroke="#D4FF00"
            strokeWidth="1"
            strokeDasharray="100"
            strokeDashoffset={100 - (currentStep * 25)}
            className="transition-all duration-1000 ease-in-out"
          />

          {/* Hub Marker */}
          <circle cx="20" cy="80" r="3" fill="#333" stroke="#D4FF00" strokeWidth="1" />
          
          {/* Destination Marker */}
          <circle cx="80" cy="20" r="3" fill="#D4FF00" />
        </svg>

        {/* Floating Icons */}
        <div className="absolute top-[20%] right-[20%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="absolute inset-0 bg-ninpo-lime blur-xl opacity-20 animate-pulse" />
            <div className="relative bg-ninpo-lime p-3 rounded-2xl shadow-neon">
              <MapPin className="w-5 h-5 text-ninpo-black" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-[20%] left-[20%] -translate-x-1/2 -translate-y-1/2">
          <div className="bg-ninpo-midnight p-3 rounded-2xl border border-white/10">
            <Package className="w-5 h-5 text-slate-500" />
          </div>
        </div>

        {/* Driver Icon (Animated along path or based on coords) */}
        {isTracking && (
          <div 
            className="absolute transition-all duration-1000 ease-linear"
            style={{ 
              left: `${20 + (currentStep * 15) + (driverCoords ? (driverCoords.lng + 74.0060) * 1000 : 0)}%`,
              top: `${80 - (currentStep * 15) - (driverCoords ? (driverCoords.lat - 40.7128) * 1000 : 0)}%`
            }}
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-ninpo-lime/20 blur-lg rounded-full animate-pulse" />
              <div className="bg-ninpo-black border-2 border-ninpo-lime p-3 rounded-2xl shadow-neon rotate-12">
                <Truck className="w-5 h-5 text-ninpo-lime" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Steps */}
      <div className="p-8 bg-ninpo-midnight/50">
        <div className="flex justify-between relative">
          {/* Connector Line */}
          <div className="absolute top-5 left-0 w-full h-0.5 bg-white/5" />
          <div 
            className="absolute top-5 left-0 h-0.5 bg-ninpo-lime transition-all duration-1000" 
            style={{ width: `${Math.max(0, (currentStep - 1) * 33.33)}%` }}
          />

          {[
            { label: 'Paid', icon: Coins, step: 1 },
            { label: 'Picked Up', icon: Package, step: 2 },
            { label: 'Arriving', icon: Truck, step: 3 },
            { label: 'Delivered', icon: CheckCircle2, step: 4 },
          ].map((s) => {
            const Icon = s.icon;
            const isActive = currentStep >= s.step;
            return (
              <div key={s.label} className="relative z-10 flex flex-col items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                  isActive ? 'bg-ninpo-lime border-ninpo-lime shadow-neon' : 'bg-ninpo-black border-white/5'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-ninpo-black' : 'text-slate-700'}`} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-700'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Coins = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
    <path d="m16.71 13.88.7.71-2.82 2.82" />
  </svg>
);

export default OrderTrackingMap;
