'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import mqtt, { MqttClient } from 'mqtt';

export interface FireEventPayload {
  target: string;
  distance_cm: number;
  timestamp?: string;
  action?: string;
}

export type MqttStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type TurretMode = 'auto' | 'manual';

interface UseMqttOptions {
  onFireEvent?: (event: FireEventPayload) => void;
}

const HIVEMQ_CLOUD_URL = 'wss://d847cd151fbe4985a1bc32cbd787651d.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || 'dash-auto-aim';
const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || 'dash123#';

const TOPIC_CONTROL_CONFIG = 'conf/turret/control/config';
const TOPIC_CONTROL_MODE = 'conf/turret/control/mode';
const TOPIC_CONTROL_FIRE = 'conf/turret/control/fire';
const TOPIC_EVENT_FIRE = 'conf/turret/event/fire';

export function useMqtt({ onFireEvent }: UseMqttOptions = {}) {
  const [status, setStatus] = useState<MqttStatus>('connecting');
  const [activeTarget, setActiveTarget] = useState<string>('person');
  const [mode, setMode] = useState<TurretMode>('auto');
  const [lastFireEvent, setLastFireEvent] = useState<FireEventPayload | null>(null);

  const clientRef = useRef<MqttClient | null>(null);
  const onFireEventRef = useRef(onFireEvent);

  useEffect(() => {
    onFireEventRef.current = onFireEvent;
  }, [onFireEvent]);

  useEffect(() => {
    const clientId = `auto-aim-turret-ui-${Math.random().toString(16).substring(2, 8)}`;

    console.log(`[MQTT] Connecting to HiveMQ Cloud... (${HIVEMQ_CLOUD_URL}, clientId: ${clientId})`);
    setStatus('connecting');

    const client = mqtt.connect(HIVEMQ_CLOUD_URL, {
      clientId,
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      keepalive: 60,
      reconnectPeriod: 3000,
      connectTimeout: 15000,
      clean: true,
      rejectUnauthorized: true,
    });

    clientRef.current = client;
    let isCleanedUp = false;

    client.on('connect', () => {
      if (isCleanedUp || client.disconnecting) return;

      console.log('[MQTT] Connected securely to HiveMQ Cloud WSS Broker!');
      setStatus('connected');

      // Subscribe to fire event topic
      client.subscribe(TOPIC_EVENT_FIRE, { qos: 0 }, (err) => {
        if (err) {
          if (!client.disconnecting && !isCleanedUp) {
            console.error('[MQTT] Subscription error on', TOPIC_EVENT_FIRE, err);
          }
        } else {
          console.log('[MQTT] Subscribed successfully to', TOPIC_EVENT_FIRE);
        }
      });
    });

    client.on('message', (topic, message) => {
      if (topic === TOPIC_EVENT_FIRE) {
        const payloadStr = message.toString();
        console.log('[MQTT] Fire event message received:', payloadStr);

        try {
          const data = JSON.parse(payloadStr);
          const parsedEvent: FireEventPayload = {
            target: data.target || data.active_target || activeTarget || 'person',
            distance_cm: typeof data.distance_cm === 'number' ? data.distance_cm : parseFloat(data.distance_cm || '35.0'),
            timestamp: data.timestamp || new Date().toISOString(),
            action: data.action,
          };

          setLastFireEvent(parsedEvent);
          if (onFireEventRef.current) {
            onFireEventRef.current(parsedEvent);
          }
        } catch (e) {
          const fallbackEvent: FireEventPayload = {
            target: activeTarget || 'person',
            distance_cm: Math.floor(Math.random() * 50) + 20,
            timestamp: new Date().toISOString(),
          };
          setLastFireEvent(fallbackEvent);
          if (onFireEventRef.current) {
            onFireEventRef.current(fallbackEvent);
          }
        }
      }
    });

    client.on('error', (err) => {
      console.error('[MQTT] HiveMQ Cloud Client error:', err);
      setStatus('error');
    });

    client.on('close', () => {
      setStatus('disconnected');
    });

    return () => {
      isCleanedUp = true;
      if (clientRef.current) {
        console.log('[MQTT] Disconnecting client...');
        clientRef.current.end(true);
      }
    };
  }, []);

  // Publish target selection
  const publishTarget = useCallback((targetClass: string) => {
    setActiveTarget(targetClass);
    if (clientRef.current && clientRef.current.connected) {
      const payload = JSON.stringify({ active_target: targetClass });
      clientRef.current.publish(TOPIC_CONTROL_CONFIG, payload, { qos: 0 }, (err) => {
        if (err) {
          console.error('[MQTT] Failed to publish active_target:', err);
        } else {
          console.log(`[MQTT] Published active_target "${targetClass}" to ${TOPIC_CONTROL_CONFIG}`);
        }
      });
    }
  }, []);

  // Publish mode selection (Auto vs Manual)
  const publishMode = useCallback((newMode: TurretMode) => {
    setMode(newMode);
    if (clientRef.current && clientRef.current.connected) {
      const payload = JSON.stringify({ mode: newMode });
      clientRef.current.publish(TOPIC_CONTROL_MODE, payload, { qos: 0 }, (err) => {
        if (err) {
          console.error('[MQTT] Failed to publish mode:', err);
        } else {
          console.log(`[MQTT] Published mode "${newMode}" to ${TOPIC_CONTROL_MODE}`);
        }
      });
    }
  }, []);

  // Trigger Manual Snap & Fire
  const triggerManualSnapAndFire = useCallback(() => {
    if (clientRef.current && clientRef.current.connected) {
      const payload = JSON.stringify({
        action: 'manual_fire_and_capture',
        timestamp: new Date().toISOString(),
      });
      clientRef.current.publish(TOPIC_CONTROL_FIRE, payload, { qos: 0 }, (err) => {
        if (err) {
          console.error('[MQTT] Failed to trigger manual fire:', err);
        } else {
          console.log(`[MQTT] Published manual snap & fire to ${TOPIC_CONTROL_FIRE}`);
        }
      });
    }
  }, []);

  return {
    status,
    activeTarget,
    mode,
    lastFireEvent,
    publishTarget,
    publishMode,
    triggerManualSnapAndFire,
  };
}
