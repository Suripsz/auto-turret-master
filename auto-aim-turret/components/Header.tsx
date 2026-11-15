'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Radio, Database, User, LogOut } from 'lucide-react';
import { MqttStatus } from '@/hooks/useMqtt';

interface HeaderProps {
  mqttStatus: MqttStatus;
  totalLogsCount: number;
  userEmail?: string | null;
  onLogout?: () => void;
}

export function Header({ mqttStatus, totalLogsCount, userEmail, onLogout }: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }) +
          ' ' +
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full glass-panel border-b border-zinc-800/80 sticky top-0 z-40 px-6 py-4 mb-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left Title & System ID */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Shield className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-zinc-100 font-bold tracking-wider text-base uppercase">
                AUTO-AIM TURRET SYSTEM
              </h1>
              <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                v2.0 AUTH
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-0.5 flex items-center gap-2">
              <span>HIVEMQ CLOUD WSS // COMMAND CENTER</span>
            </p>
          </div>
        </div>

        {/* Right Status Indicators, Operator & Logout */}
        <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
          {/* Real-time Clock */}
          <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-300">
            {time || '2026-08-16 14:55:00'}
          </div>

          {/* MQTT Connection Badge */}
          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl">
            <Radio
              className={`w-3.5 h-3.5 ${
                mqttStatus === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-rose-400'
              }`}
            />
            <span className="text-zinc-300 uppercase">
              Cloud WSS: {mqttStatus}
            </span>
          </div>

          {/* Operator Email Badge & Logout */}
          {userEmail && (
            <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-300">
              <User className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-zinc-200 font-medium">{userEmail}</span>
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl transition-colors text-xs font-sans"
              title="Logout Operator"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
