'use client';

import React from 'react';
import { History, RefreshCw, Crosshair, Calendar, ShieldCheck } from 'lucide-react';

export interface FireEventRecord {
  id: string;
  target: string;
  distance_cm: number;
  timestamp: string;
}

interface EventLogTableProps {
  logs: FireEventRecord[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function EventLogTable({ logs, isLoading, onRefresh }: EventLogTableProps) {
  return (
    <div className="w-full glass-panel rounded-2xl p-6 border border-zinc-800 space-y-4 shadow-xl">
      {/* Table Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
            <History className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-zinc-100 text-base font-semibold tracking-tight">Firing Event History</h3>
            <p className="text-zinc-400 text-xs mt-0.5">
              Live engagement log synchronized with Supabase database ({logs.length} events)
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 rounded-xl transition-all disabled:opacity-50"
          title="Refresh Event Log"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/80 text-zinc-400 font-mono uppercase text-[11px] border-b border-zinc-800/80">
            <tr>
              <th className="py-3 px-4">Event ID</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Target Class</th>
              <th className="py-3 px-4">Distance (cm)</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {isLoading && logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                    <span>Loading logs from Supabase...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500 font-sans">
                  No firing events recorded yet. Connect MQTT or trigger test fire.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const formattedTime = new Date(log.timestamp).toLocaleString([], {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-900/60 transition-colors group"
                  >
                    <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                      {log.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {formattedTime}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30 uppercase">
                        <Crosshair className="w-3 h-3 text-rose-400" />
                        {log.target}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-200">
                      <span className="font-semibold text-rose-200">{log.distance_cm.toFixed(1)}</span> cm
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-sans">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Saved
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
