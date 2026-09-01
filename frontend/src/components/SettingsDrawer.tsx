import React, { useState } from 'react';
import type { DetectorConfig } from '../types';
import { Sliders, Zap, RotateCcw, Play, Pause, FastForward, X } from 'lucide-react';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: DetectorConfig;
  isPaused: boolean;
  speed: number;
  onTogglePause: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: number) => void;
  onInjectSpike: (archetype: string) => void;
  onUpdateConfig: (newCfg: Partial<DetectorConfig>) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  config,
  isPaused,
  speed,
  onTogglePause,
  onStepForward,
  onReset,
  onChangeSpeed,
  onInjectSpike,
  onUpdateConfig,
}) => {
  const [windowSize, setWindowSize] = useState(config.window_size || 25);
  const [zThreshold, setZThreshold] = useState(config.z_threshold || 2.5);

  if (!isOpen) return null;

  const handleApply = async () => {
    onUpdateConfig({
      window_size: windowSize,
      z_threshold: zThreshold,
    });
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          window_size: windowSize,
          z_threshold: zThreshold,
        }),
      });
    } catch (e) {
      console.error("Config update error", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#FFFFFF] border-l-3 border-[#18181B] shadow-2xl h-full p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-2 border-[#18181B] pb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#DBEAFE] text-[#2563EB] border-2 border-[#18181B] rounded-lg">
                <Sliders className="w-5 h-5 stroke-[2.5]" />
              </span>
              <h3 className="font-display text-base font-black text-[#18181B]">Detector Controls & Telemetry</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#FAF6F0] border-2 border-[#18181B] hover:bg-[#EF4444] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          <div className="space-y-3">
            <span className="micro-label font-mono text-[#18181B]">Replay Stream Controls</span>
            <div className="flex items-center gap-2 bg-[#FAF6F0] p-2.5 rounded-lg border-2 border-[#18181B] font-mono text-xs">
              <button
                onClick={onTogglePause}
                className="flex-1 py-2 neo-btn neo-btn-primary text-xs text-white"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={onStepForward}
                disabled={!isPaused}
                className="px-3 py-2 neo-btn neo-btn-white text-xs"
                title="Advance 1 transaction"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Step</span>
              </button>

              <button
                onClick={onReset}
                className="px-3 py-2 neo-btn neo-btn-white text-xs text-[#D97706]"
                title="Reset stream"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <span className="text-[#52525B] font-bold">Playback Speed:</span>
              <div className="flex gap-1">
                {[1, 2, 5, 10].map((s) => (
                  <button
                    key={s}
                    onClick={() => onChangeSpeed(s)}
                    className={`px-2.5 py-1 rounded font-bold border border-[#18181B] cursor-pointer ${
                      speed === s ? 'bg-[#2563EB] text-white shadow-[1.5px_1.5px_0px_#18181B]' : 'bg-[#FAF6F0] text-[#52525B]'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-3 border-t-2 border-[#18181B] font-mono text-xs">
            <span className="micro-label text-[#18181B]">Spike Sensitivity Tuning</span>
            
            <div>
              <div className="flex justify-between mb-1.5 font-bold">
                <span className="text-[#52525B]">Rolling Window Size:</span>
                <span className="text-[#2563EB]">{windowSize} txns</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-bold">
                <span className="text-[#52525B]">Z-Score Alert Cutoff:</span>
                <span className="text-[#EF4444]">+{zThreshold.toFixed(1)}σ</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="3.5"
                step="0.1"
                value={zThreshold}
                onChange={(e) => setZThreshold(Number(e.target.value))}
                className="w-full accent-[#EF4444] cursor-pointer"
              />
            </div>

            <button
              onClick={handleApply}
              className="w-full py-2.5 neo-btn neo-btn-primary text-xs text-white"
            >
              Apply Parameter Updates
            </button>
          </div>

          <div className="space-y-3 pt-3 border-t-2 border-[#18181B] font-mono text-xs">
            <div className="flex items-center gap-1.5 text-[#18181B]">
              <Zap className="w-4 h-4 text-[#EF4444] stroke-[2.5]" />
              <span className="micro-label font-bold text-[#18181B]">Inject Attack Bursts</span>
            </div>
            <p className="text-[11px] text-[#52525B]">
              Triggers synthetic coordinated fraud clusters in real-time to demonstrate time-to-detection and visual alert triggers.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => onInjectSpike('card_testing_bot_burst')}
                className="w-full text-left p-3 rounded-lg bg-[#FAF6F0] hover:bg-[#FFF5F5] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer transition-all"
              >
                <div className="font-bold text-xs text-[#EF4444]">Card Testing Botnet Burst</div>
                <div className="text-[10px] text-[#52525B] mt-0.5">15 micro-transactions in rapid succession</div>
              </button>

              <button
                onClick={() => onInjectSpike('credential_stuffing_ring')}
                className="w-full text-left p-3 rounded-lg bg-[#FAF6F0] hover:bg-[#FFFDF5] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer transition-all"
              >
                <div className="font-bold text-xs text-[#D97706]">Credential Stuffing ATO Cluster</div>
                <div className="text-[10px] text-[#52525B] mt-0.5">Multi-account login failures and high-value orders</div>
              </button>

              <button
                onClick={() => onInjectSpike('high_velocity_ato_surge')}
                className="w-full text-left p-3 rounded-lg bg-[#FAF6F0] hover:bg-[#EFF6FF] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer transition-all"
              >
                <div className="font-bold text-xs text-[#2563EB]">High-Ticket Crypto Velocity Storm</div>
                <div className="text-[10px] text-[#52525B] mt-0.5">Coordinated multi-thousand rupee withdrawals</div>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-[#18181B] flex items-center justify-center gap-2 text-[10px] font-mono text-[#52525B] font-bold">
          <img src="/logo.svg" alt="Pulse" className="w-4 h-4 object-contain" />
          <span>Pulse AI Risk Engine · Sentinel Edition</span>
        </div>
      </div>
    </div>
  );
};
