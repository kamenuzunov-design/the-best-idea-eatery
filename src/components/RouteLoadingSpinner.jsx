import React from 'react';

const RouteLoadingSpinner = () => {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-6 transition-opacity duration-300">
      <div className="relative flex items-center justify-center">
        {/* Glowing backdrop pulse */}
        <div className="absolute w-16 h-16 rounded-full bg-primary/20 blur-xl animate-pulse" />
        
        {/* Spinning outer ring */}
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        
        {/* Culinary center icon */}
        <span className="material-symbols-outlined absolute text-primary text-xl select-none animate-pulse">
          restaurant
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wider uppercase">
        Loading...
      </p>
    </div>
  );
};

export default RouteLoadingSpinner;
