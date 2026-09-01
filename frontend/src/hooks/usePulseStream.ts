import { useState, useEffect, useRef, useCallback } from 'react';
import type { Transaction, VitalsPoint, SpikeFlag, DetectorConfig } from '../types';

export function usePulseStream() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [streamIndex, setStreamIndex] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(5079);
  
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsPoint[]>([]);
  const [flags, setFlags] = useState<SpikeFlag[]>([]);
  const [activeSpikeAlert, setActiveSpikeAlert] = useState<SpikeFlag | null>(null);
  
  const [config, setConfig] = useState<DetectorConfig>({
    is_running: true,
    is_paused: false,
    speed_multiplier: 1.0,
    window_size: 25,
    z_threshold: 2.5,
    ewma_alpha: 0.08,
    risk_cutoff: 0.50
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const connectRef = useRef<() => void>(() => {});

  // Strict deduplication helper for transactions
  const addTransactionDeduplicated = (prev: Transaction[], newTxn: Transaction): Transaction[] => {
    const existingIndex = prev.findIndex(t => t.txn_id === newTxn.txn_id);
    if (existingIndex !== -1) {
      const updated = [...prev];
      updated[existingIndex] = newTxn;
      return updated;
    }
    return [newTxn, ...prev].slice(0, 60);
  };

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'SNAPSHOT') {
            setIsPaused(data.is_paused);
            setSpeed(data.speed_multiplier);
            setStreamIndex(data.stream_index);
            setTotalTransactions(data.total_transactions || 5079);
            
            if (data.recent_txns) {
              const seen = new Set<string>();
              const uniqueTxns: Transaction[] = [];
              for (const t of data.recent_txns) {
                if (!seen.has(t.txn_id)) {
                  seen.add(t.txn_id);
                  uniqueTxns.push(t);
                }
              }
              setRecentTxns(uniqueTxns);
            }
            
            if (data.recent_vitals) setVitalsHistory(data.recent_vitals);
            if (data.flags) setFlags(data.flags);
            if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
          } 
          else if (data.type === 'TICK') {
            setStreamIndex(data.stream_index);
            setTotalTransactions(data.total_transactions);
            
            if (data.txn) {
              setRecentTxns(prev => addTransactionDeduplicated(prev, data.txn));
            }
            
            if (data.vitals) {
              setVitalsHistory(prev => [...prev.slice(-59), data.vitals]);
              if (!data.vitals.in_spike && activeSpikeAlert) {
                setActiveSpikeAlert(null);
              }
            }
            
            if (data.spike_flag) {
              setActiveSpikeAlert(data.spike_flag);
              setFlags(prev => [data.spike_flag, ...prev.filter(f => f.id !== data.spike_flag.id)]);
            }
            
            if (data.txn_flag) {
              setFlags(prev => [data.txn_flag, ...prev.filter(f => f.id !== data.txn_flag.id)]);
            }
          }
          else if (data.type === 'FLAG_ACTION') {
            setFlags(prev => prev.map(f => f.id === data.flag_id ? { ...f, resolved: true, resolved_action: data.action, status: 'resolved' } : f));
            if (activeSpikeAlert && activeSpikeAlert.id === data.flag_id) {
              setActiveSpikeAlert(prev => prev ? { ...prev, resolved: true, resolved_action: data.action } : null);
            }
          }
          else if (data.type === 'CONFIG_UPDATE') {
            if (data.config) {
              setConfig(data.config);
              setIsPaused(data.config.is_paused);
              setSpeed(data.config.speed_multiplier);
            }
          }
        } catch (err) {
          console.error("Error parsing WS message", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current();
        }, 2000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      console.error("WebSocket connection error:", e);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current();
      }, 2000);
    }
  }, [activeSpikeAlert]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const togglePause = async () => {
    const action = isPaused ? 'resume' : 'pause';
    try {
      await fetch(`/api/replay/control?action=${action}`, { method: 'POST' });
      setIsPaused(!isPaused);
    } catch (e) {
      console.error("Error toggling pause", e);
    }
  };

  const stepForward = async () => {
    try {
      await fetch('/api/replay/control?action=step', { method: 'POST' });
    } catch (e) {
      console.error("Error stepping forward", e);
    }
  };

  const resetReplay = async () => {
    try {
      await fetch('/api/replay/control?action=reset', { method: 'POST' });
      setRecentTxns([]);
      setVitalsHistory([]);
      setFlags([]);
      setActiveSpikeAlert(null);
      setStreamIndex(0);
    } catch (e) {
      console.error("Error resetting replay", e);
    }
  };

  const changeSpeed = async (newSpeed: number) => {
    setSpeed(newSpeed);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed_multiplier: newSpeed })
      });
    } catch (e) {
      console.error("Error setting speed", e);
    }
  };

  const injectSpike = async (archetype: string = "card_testing_bot_burst", burstSize: number = 16) => {
    try {
      await fetch('/api/replay/inject-spike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archetype, burst_size: burstSize })
      });
    } catch (e) {
      console.error("Error injecting spike", e);
    }
  };

  const updateConfig = (newCfg: Partial<DetectorConfig>) => {
    setConfig(prev => ({ ...prev, ...newCfg }));
  };

  return {
    isConnected,
    isPaused,
    speed,
    streamIndex,
    totalTransactions,
    recentTxns,
    vitalsHistory,
    flags,
    activeSpikeAlert,
    config,
    togglePause,
    stepForward,
    resetReplay,
    changeSpeed,
    injectSpike,
    setFlags,
    updateConfig
  };
}
