'use client';

import React, { useEffect } from 'react';
import { Crosshair, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { FireEventPayload } from '@/hooks/useMqtt';

interface ToastProps {
  event: FireEventPayload | null;
  onClose: () => void;
}

export function Toast({ event, onClose }: ToastProps) {
  useEffect(() => {
    if (event) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [event, onClose]);

  if (!event) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 bg-zinc-900/90 border border-rose-500/40 text-zinc-100 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl max-w-sm">
        <div className="flex-shrink-0 relative">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75"></span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
            <Crosshair className="w-4.5 h-4.5" />
          </div>
        </div>
        <div className="flex-1 text-sm">
          <div className="font-semibold text-rose-400 flex items-center justify-between">
            <span>TARGET FIRED</span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="text-zinc-300 text-xs mt-0.5">
            Locked on <span className="font-medium text-white underline decoration-rose-500/50">{event.target}</span> at <span className="font-mono text-rose-300">{event.distance_cm.toFixed(1)} cm</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-100 transition-colors p-1"
          aria-label="Close Toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
