'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useMqtt, FireEventPayload } from '@/hooks/useMqtt';
import { Header } from '@/components/Header';
import { VideoFeed } from '@/components/VideoFeed';
import { ControlPanel } from '@/components/ControlPanel';
import { EventLogTable, FireEventRecord } from '@/components/EventLogTable';
import { Toast } from '@/components/Toast';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [logs, setLogs] = useState<FireEventRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [currentToastEvent, setCurrentToastEvent] = useState<FireEventPayload | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Check Supabase user session
  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserEmail(data.user.email || 'Operator');
      }
    }
    checkUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Fetch latest 50 logs from GET /api/logs
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/logs', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data);
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching logs from /api/logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle incoming MQTT fire event
  const handleFireEvent = useCallback(
    async (event: FireEventPayload) => {
      console.log('[Dashboard] Fire event handler triggered:', event);
      
      // 1. Show Toast
      setCurrentToastEvent(event);

      // 2. Trigger visual target lock pulse
      setIsLocked(true);
      setTimeout(() => setIsLocked(false), 2000);

      // 3. Save event to Supabase via POST /api/logs
      try {
        const response = await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: event.target,
            distance_cm: event.distance_cm,
            timestamp: event.timestamp || new Date().toISOString(),
          }),
        });

        const result = await response.json();
        console.log('[Dashboard] Log saved to database:', result);

        // 4. Dynamically refresh log table data
        fetchLogs();
      } catch (err) {
        console.error('[Dashboard] Failed to save log via /api/logs:', err);
      }
    },
    [fetchLogs]
  );

  // Custom MQTT Hook connected to HiveMQ Cloud WSS
  const {
    status: mqttStatus,
    activeTarget,
    mode,
    publishTarget,
    publishMode,
    triggerManualSnapAndFire,
  } = useMqtt({
    onFireEvent: handleFireEvent,
  });

  return (
    <div className="min-h-screen bg-grid-pattern text-zinc-100 flex flex-col font-sans pb-16 selection:bg-rose-500/30 selection:text-rose-200">
      {/* Top Navigation & System HUD */}
      <Header
        mqttStatus={mqttStatus}
        totalLogsCount={logs.length}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto w-full px-6 flex-1 space-y-8">
        
        {/* Top Split Layout: Video Stream & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Center Focus Video Feed (7 Cols on large screens) */}
          <section className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Primary Vision Sensor Feed
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                URL: <code className="text-zinc-300">http://localhost:5000/video_feed</code>
              </span>
            </div>

            <VideoFeed 
              streamUrl="http://localhost:5000/video_feed" 
              isLocked={isLocked} 
              activeTarget={activeTarget}
              mode={mode}
            />
          </section>

          {/* Control Panel (5 Cols on large screens) */}
          <section className="lg:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Hardware Target & Mode Control
              </span>
              <span className="text-[11px] font-mono text-rose-400">
                ACTIVE: {activeTarget.toUpperCase()}
              </span>
            </div>

            <ControlPanel
              activeTarget={activeTarget}
              onSelectTarget={publishTarget}
              mode={mode}
              onSelectMode={publishMode}
              onManualSnapAndFire={triggerManualSnapAndFire}
              mqttStatus={mqttStatus}
            />
          </section>
        </div>

        {/* Bottom Full-Width Section: Event Log History */}
        <section className="w-full">
          <EventLogTable 
            logs={logs} 
            isLoading={isLoadingLogs} 
            onRefresh={fetchLogs} 
          />
        </section>
      </main>

      {/* Subtle Toast Notification on Fire Event */}
      <Toast 
        event={currentToastEvent} 
        onClose={() => setCurrentToastEvent(null)} 
      />
    </div>
  );
}
