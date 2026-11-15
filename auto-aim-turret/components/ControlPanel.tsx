'use client';

import React from 'react';
import { Target, Cpu, Check, Camera, ShieldAlert, Sparkles, Sliders } from 'lucide-react';
import { MqttStatus, TurretMode } from '@/hooks/useMqtt';

interface ControlPanelProps {
  activeTarget: string;
  onSelectTarget: (target: string) => void;
  mode: TurretMode;
  onSelectMode: (mode: TurretMode) => void;
  onManualSnapAndFire: () => void;
  mqttStatus: MqttStatus;
}

const TARGET_CLASSES = [
  { id: 'person', label: 'Person', desc: 'Human Subject' },
  { id: 'cup', label: 'Cup', desc: 'Container' },
  { id: 'bottle', label: 'Bottle', desc: 'Beverage Container' },
  { id: 'drone', label: 'Drone', desc: 'Aerial Vehicle' },
  { id: 'custom', label: 'Custom Target', desc: 'Generic Payload' },
];

export function ControlPanel({
  activeTarget,
  onSelectTarget,
  mode,
  onSelectMode,
  onManualSnapAndFire,
  mqttStatus,
}: ControlPanelProps) {
  return (
    <div className="w-full glass-panel rounded-2xl p-6 border border-zinc-800 space-y-6 flex flex-col justify-between shadow-xl">
      {/* Header & Broker Health */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
            <Cpu className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-zinc-100 text-base font-semibold tracking-tight">Turret Control Panel</h3>
            <p className="text-zinc-400 text-xs mt-0.5">Mode switching, target tracking & manual snap fire</p>
          </div>
        </div>

        {/* MQTT Status Indicator */}
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                mqttStatus === 'connected'
                  ? 'bg-emerald-400'
                  : mqttStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                mqttStatus === 'connected'
                  ? 'bg-emerald-500'
                  : mqttStatus === 'connecting'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="font-mono text-zinc-300 uppercase text-[11px]">
            Cloud WSS: {mqttStatus}
          </span>
        </div>
      </div>

      {/* 1. Mode Switcher (Auto vs Manual) */}
      <div className="space-y-2 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            Operation Mode
          </label>
          <span className={`text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${
            mode === 'auto'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {mode === 'auto' ? 'AUTONOMOUS' : 'MANUAL OVERRIDE'}
          </span>
        </div>

        {/* Animated Pill Toggle */}
        <div className="relative grid grid-cols-2 gap-1 p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => onSelectMode('auto')}
            className={`py-2 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'auto'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto Mode</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('manual')}
            className={`py-2 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'manual'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Manual Mode</span>
          </button>
        </div>
        <p className="text-[11px] text-zinc-500 font-mono">
          Topic: <code className="text-zinc-400">dimaspe/turret/control/mode</code> → payload: <code className="text-rose-300">{`{"mode": "${mode}"}`}</code>
        </p>
      </div>

      {/* 2. Target Class Selection */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
          Target Class Payload
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TARGET_CLASSES.map((t) => {
            const isSelected = activeTarget === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTarget(t.id)}
                className={`relative flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-zinc-900 border-rose-500/80 text-zinc-100 shadow-[0_0_15px_rgba(244,63,94,0.12)]'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-zinc-800/60 text-zinc-500'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-zinc-200 block">{t.label}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-400">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Manual Snap & Fire Button (Active only in Manual mode) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onManualSnapAndFire}
          disabled={mode === 'auto' || mqttStatus !== 'connected'}
          className={`w-full relative group overflow-hidden py-3.5 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border shadow-lg ${
            mode === 'manual' && mqttStatus === 'connected'
              ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white border-rose-400/30 shadow-rose-950/50 cursor-pointer'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-60'
          }`}
        >
          <Camera className={`w-4 h-4 ${mode === 'manual' ? 'text-rose-200 animate-pulse' : 'text-zinc-600'}`} />
          <span>
            {mode === 'auto' ? 'Manual Snap & Fire (Disabled in Auto Mode)' : 'Manual Snap & Fire'}
          </span>
        </button>
        {mode === 'manual' && (
          <p className="text-[11px] text-zinc-500 font-mono mt-1 text-center">
            Publishes <code className="text-rose-400">{`{"action": "manual_fire_and_capture"}`}</code> to <code className="text-zinc-400">dimaspe/turret/control/fire</code>
          </p>
        )}
      </div>
    </div>
  );
}
