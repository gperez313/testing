import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ScanLine, 
  Camera, 
  ArrowLeft,
  PackageCheck,
  ShieldCheck
} from 'lucide-react';
import { Order, ScannerMode } from '../types';

interface DriverVerificationDeliveryProps {
  activeOrder: Order;
  onBack: () => void;
  scannerMode: ScannerMode;
  setScannerMode: (mode: ScannerMode) => void;
  setScannerOpen: (open: boolean) => void;
  scannerError: string | null;
  verificationScans: { upc: string; timestamp: string }[];
  onClearVerification: () => void;
  onSubmitVerification: () => void;
  isVerifying: boolean;
  capturedPhoto: string | null;
  onCapturePhoto: () => void;
}

const DriverVerificationDelivery: React.FC<DriverVerificationDeliveryProps> = ({
  activeOrder,
  onBack,
  scannerMode,
  setScannerMode,
  setScannerOpen,
  scannerError,
  verificationScans,
  onClearVerification,
  onSubmitVerification,
  isVerifying,
  capturedPhoto,
  onCapturePhoto
}) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dispatch
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Verification</p>
          <p className="text-white font-black text-lg uppercase">Order #{activeOrder.id.slice(-6)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-ninpo-lime" /> Container Verification
              </h3>
              <button
                onClick={() => setScannerOpen(true)}
                className="px-4 py-2 rounded-xl bg-ninpo-lime text-ninpo-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <ScanLine className="w-4 h-4" /> Start Scanning
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setScannerMode(ScannerMode.DRIVER_VERIFY_CONTAINERS)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  scannerMode === ScannerMode.DRIVER_VERIFY_CONTAINERS
                    ? 'bg-ninpo-lime text-ninpo-black'
                    : 'bg-white/5 text-white border border-white/10'
                }`}
              >
                Returns
              </button>
              <button
                onClick={() => setScannerMode(ScannerMode.DRIVER_FULFILL_ORDER)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  scannerMode === ScannerMode.DRIVER_FULFILL_ORDER
                    ? 'bg-ninpo-lime text-ninpo-black'
                    : 'bg-white/5 text-white border border-white/10'
                }`}
              >
                Fulfillment
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
                <span>Scanned Containers (MI 10¢)</span>
                <span className="text-ninpo-lime">{verificationScans.length} verified • ${(verificationScans.length * 0.1).toFixed(2)}</span>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {verificationScans.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl">
                    <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest">No containers scanned yet</p>
                    <p className="text-[8px] uppercase font-bold text-slate-700 tracking-widest mt-2">Michigan 10¢ Deposit Standard</p>
                  </div>
                ) : (
                  verificationScans.map((scan, idx) => (
                    <div key={idx} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-ninpo-lime/20 text-ninpo-lime flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase">{scan.upc}</p>
                          <p className="text-[8px] font-bold text-ninpo-lime uppercase tracking-widest">Eligible: $0.10</p>
                        </div>
                      </div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {verificationScans.length > 0 && (
                <button
                  onClick={onClearVerification}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                  Clear All Scans
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-ninpo-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-3">
              <Camera className="w-4 h-4 text-ninpo-lime" /> Verification Proof
            </h3>

            <div className="aspect-video bg-black/40 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
              {capturedPhoto ? (
                <>
                  <img src={capturedPhoto} alt="Verification" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={onCapturePhoto}
                      className="px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Retake Photo
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Camera className="w-12 h-12 text-slate-800 mb-4" />
                  <button
                    onClick={onCapturePhoto}
                    className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Take Verification Photo
                  </button>
                </>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={onSubmitVerification}
                disabled={isVerifying || verificationScans.length === 0 || !capturedPhoto}
                className="w-full py-5 bg-ninpo-lime text-ninpo-black rounded-[2rem] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all shadow-xl shadow-ninpo-lime/10"
              >
                {isVerifying ? (
                  <>Syncing Verification...</>
                ) : (
                  <>
                    <PackageCheck className="w-5 h-5" /> Complete Verification
                  </>
                )}
              </button>
              {verificationScans.length === 0 && (
                <p className="text-[9px] text-center text-slate-500 uppercase tracking-widest mt-4">
                  Scan at least one container to proceed
                </p>
              )}
            </div>
          </div>

          {scannerError && (
            <div className="bg-ninpo-red/10 border border-ninpo-red/20 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-ninpo-red" />
              <p className="text-[10px] font-black uppercase tracking-widest text-ninpo-red">{scannerError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverVerificationDelivery;
