'use client';

import { useEffect, useState } from 'react';

export default function TabletLandscapeGuard() {
  const [showGuard, setShowGuard] = useState(false);

  useEffect(() => {
    function checkOrientation() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const isPortrait = height > width;

      const isTablet =
        width >= 768 &&
        width <= 1180 &&
        'ontouchstart' in window;

      setShowGuard(isTablet && isPortrait);
    }

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!showGuard) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f4f7ef] px-6 text-center">
      <div className="w-full max-w-md rounded-3xl border border-[#dfe8d2] bg-white p-8 shadow-2xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#eef5e8] text-4xl">
          ↻
        </div>

        <h1 className="text-2xl font-bold text-[#2f3a25]">
          Putar Tablet ke Landscape
        </h1>

        <p className="mt-3 text-[#6f7b62]">
          Untuk tampilan POS yang lebih rapi, aplikasi ini digunakan dalam mode
          landscape pada tablet.
        </p>

        <div className="mt-6 rounded-2xl bg-[#eef5e8] p-4 text-sm text-[#5f7f4f]">
          Mode ini hanya berlaku untuk tablet. Tampilan HP dan desktop tetap
          normal.
        </div>
      </div>
    </div>
  );
}