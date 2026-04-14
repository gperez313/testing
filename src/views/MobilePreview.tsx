import React from 'react';
import MobileApp from '../../mobile/App';

const MobilePreview = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 p-4">
      <div className="relative w-[375px] h-[812px] bg-black rounded-[60px] border-[8px] border-zinc-800 shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-zinc-800 rounded-b-3xl z-50" />
        
        {/* Mobile App Content */}
        <div className="w-full h-full">
          <MobileApp />
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Mobile Preview</h2>
        <p className="text-zinc-400 text-sm max-w-md">
          This is a high-fidelity preview of the React Native application using react-native-web.
          The code in <code className="bg-zinc-800 px-1 rounded">/mobile</code> is ready for Expo or React Native CLI.
        </p>
      </div>
    </div>
  );
};

export default MobilePreview;
