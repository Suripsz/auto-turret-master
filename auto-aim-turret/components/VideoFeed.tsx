'use client';

import React, { useState } from 'react';
import { Camera, RefreshCw, Radio, Sparkles, ShieldAlert } from 'lucide-react';
import { TurretMode } from '@/hooks/useMqtt';

interface VideoFeedProps {
  streamUrl?: string;
  isLocked?: boolean;
  activeTarget?: string;
  mode?: TurretMode;
}

export function VideoFeed({ 
  streamUrl = 'http://localhost:5000/video_feed',
  isLocked = false,
  activeTarget = 'person',
  mode = 'auto'
}: VideoFeedProps) {
  const [hasError, setHasError] = useState(false);
  const [key, setKey] = useState(0);

  const handleRetry = () => {
    setHasError(false);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden glass-panel border border-zinc-800 shadow-2xl flex flex-col items-center justify-center bg-zinc-950/80 group">
      
      {/* Target Lock Border Accent */}
      <div 
        className={`absolute inset-0 border-2 pointer-events-none transition-all duration-300 rounded-2xl z-20 ${
          isLocked ? 'border-rose-500/70 shadow-[inset_0_0_30px_rgba(244,63,94,0.15)]' : 'border-transparent'
        }`}
      />

      {/* Video Feed Content */}
      {!hasError ? (
        <img
          key={key}
          src={streamUrl}
          alt="Live Vision Stream"
          className="w-full h-full object-cover rounded-2xl"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8 z-10 space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-zinc-200 text-sm font-semibold">Python Vision Node Offline</h4>
            <p className="text-zinc-500 text-xs mt-1 max-w-md">
              Unable to load MJPEG stream from <code className="text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded text-[11px]">{streamUrl}</code>. Please make sure YOLOv8 vision server is running locally on port 5000.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 rounded-lg transition-colors mt-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reconnect Stream
          </button>
        </div>
      )}

      {/* Futuristic HUD Crosshair & Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4">
        {/* Top Overlay HUD */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-zinc-800 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasError ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${hasError ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="font-mono text-zinc-300 tracking-wide uppercase text-[11px]">
              {hasError ? 'STREAM DISCONNECTED' : 'LIVE YOLOV8 VISION'}
            </span>
          </div>

          {/* Active Mode & Target Badge */}
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[11px] backdrop-blur-md px-2.5 py-1 rounded-lg border flex items-center gap-1.5 uppercase font-semibold ${
              mode === 'auto'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {mode === 'auto' ? <Sparkles className="w-3 h-3 text-emerald-400" /> : <ShieldAlert className="w-3 h-3 text-rose-400" />}
              {mode === 'auto' ? 'AUTO MODE' : 'MANUAL MODE'}
            </span>

            <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800">
              TARGET: <span className="text-zinc-100 font-semibold uppercase">{activeTarget}</span>
            </span>
          </div>
        </div>

        {/* Center Crosshair graphic */}
        {!hasError && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity">
            <div className="relative w-28 h-28 border border-zinc-400/40 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <div className="absolute top-0 w-0.5 h-4 bg-zinc-400/60" />
              <div className="absolute bottom-0 w-0.5 h-4 bg-zinc-400/60" />
              <div className="absolute left-0 h-0.5 w-4 bg-zinc-400/60" />
              <div className="absolute right-0 h-0.5 w-4 bg-zinc-400/60" />
            </div>
          </div>
        )}

        {/* Bottom Overlay HUD */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800">
            RES: 1920x1080 @ 30FPS
          </div>
          <div className="bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
            <span className="text-zinc-300">ESP32 SERVO NODE: ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
