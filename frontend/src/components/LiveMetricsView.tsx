import React, { useMemo } from 'react';
import type { VitalsPoint, SpikeFlag, Transaction, DetectorConfig } from '../types';
import { BarChart2, Radio, X, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

interface LiveMetricsViewProps {
  isOpen: boolean;
  onClose: () => void;
  vitalsHistory: VitalsPoint[];
  activeSpikeAlert: SpikeFlag | null;
  flags: SpikeFlag[];
  recentTxns: Transaction[];
  streamIndex: number;
  totalTransactions: number;
  speed: number;
  config: DetectorConfig;
  isConnected: boolean;
}

export const LiveMetricsView: React.FC<LiveMetricsViewProps> = ({
  isOpen,
  onClose,
  vitalsHistory,
  activeSpikeAlert,
  flags,
  recentTxns,
  streamIndex,
  totalTransactions,
  speed,
  config,
  isConnected,
}) => {
  if (!isOpen) return null;

  const currentVitals = vitalsHistory.length > 0 ? vitalsHistory[vitalsHistory.length - 1] : null;

  const progressPercent = totalTransactions > 0 ? ((streamIndex / totalTransactions) * 100).toFixed(1) : '0';

  // Compute live risk distribution from recent transactions in memory buffer
  const distribution = useMemo(() => {
    let low = 0;
    let med = 0;
    let high = 0;
    recentTxns.forEach(t => {
      if (t.score < 0.3) low++;
      else if (t.score < 0.7) med++;
      else high++;
    });
    const total = recentTxns.length || 1;
    return {
      low,
      med,
      high,
      lowPct: ((low / total) * 100).toFixed(0),
      medPct: ((med / total) * 100).toFixed(0),
      highPct: ((high / total) * 100).toFixed(0),
      total: recentTxns.length,
    };
  }, [recentTxns]);

  const spikeFlags = flags.filter(f => f.type === 'spike');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] border-3 border-[#18181B] shadow-[8px_8px_0px_#18181B] rounded-xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b-2 border-[#18181B] flex items-center justify-between bg-[#FAF6F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#0C0E12] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] p-1 shrink-0">
              <img src="/logo.svg" alt="Pulse" className="w-full h-full object-contain filter drop-shadow-[0_0_4px_rgba(36,238,93,0.4)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="neo-badge neo-badge-green text-[10px] flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> LIVE SESSION TELEMETRY
                </span>
                <h3 className="font-display text-base font-black text-[#18181B]">Real-Time Vitals & Stream Session Report</h3>
              </div>
              <p className="text-xs text-[#52525B] font-mono mt-0.5">
                Active in-memory telemetry, EWMA risk rates, rolling Z-score deviation, and live score distributions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#EF4444] hover:text-white text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Live Stream Telemetry KPI Strip */}
        <div className="p-4 bg-[#F5EFEB] border-b-2 border-[#18181B] grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-white p-3 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
            <div className="text-[10px] uppercase font-bold text-[#52525B]">Replay Progress</div>
            <div className="text-base font-black text-[#18181B] mt-0.5">{streamIndex} / {totalTransactions}</div>
            <div className="text-[10px] text-[#2563EB] font-bold mt-0.5">{progressPercent}% streamed</div>
          </div>

          <div className="bg-white p-3 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
            <div className="text-[10px] uppercase font-bold text-[#52525B]">Current EWMA Risk</div>
            <div className="text-base font-black text-[#18181B] mt-0.5">
              {currentVitals ? `${(currentVitals.baseline_ewma * 100).toFixed(2)}%` : '2.00%'}
            </div>
            <div className="text-[10px] text-[#52525B] mt-0.5">Rate: {currentVitals ? `${(currentVitals.current_risk_rate * 100).toFixed(1)}%` : '2.0%'}</div>
          </div>

          <div className="bg-white p-3 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
            <div className="text-[10px] uppercase font-bold text-[#52525B]">Current Deviation</div>
            <div className={`text-base font-black mt-0.5 ${
              (currentVitals?.z_score ?? 0) >= (config.z_threshold || 2.5) ? 'text-[#EF4444]' : 'text-[#10B981]'
            }`}>
              {currentVitals ? `${currentVitals.z_score >= 0 ? '+' : ''}${currentVitals.z_score.toFixed(2)}σ` : '+0.00σ'}
            </div>
            <div className="text-[10px] text-[#52525B] mt-0.5">Threshold: +{config.z_threshold || 2.5}σ</div>
          </div>

          <div className="bg-white p-3 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
            <div className="text-[10px] uppercase font-bold text-[#52525B]">Feed Connection</div>
            <div className="text-base font-black text-[#10B981] mt-0.5 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}></span>
              <span>{isConnected ? 'Connected' : 'Reconnecting'}</span>
            </div>
            <div className="text-[10px] text-[#52525B] mt-0.5">Speed: {speed}x Replay</div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 font-mono text-xs bg-[#FFFFFF]">
          {/* Live Risk Distribution Section */}
          <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#2563EB]" />
                <h4 className="font-bold text-[#18181B] text-xs uppercase">Live Score Distribution (Memory Buffer: {distribution.total} txns)</h4>
              </div>
              <span className="text-[11px] text-[#52525B]">Real-time slice</span>
            </div>

            {/* Segmented bar */}
            <div className="w-full h-6 rounded-md border-2 border-[#18181B] overflow-hidden flex shadow-xs">
              <div style={{ width: `${distribution.lowPct}%` }} className="bg-[#10B981] flex items-center justify-center text-[10px] font-bold text-white transition-all">
                {Number(distribution.lowPct) > 10 ? `${distribution.lowPct}%` : ''}
              </div>
              <div style={{ width: `${distribution.medPct}%` }} className="bg-[#F59E0B] flex items-center justify-center text-[10px] font-bold text-white transition-all">
                {Number(distribution.medPct) > 10 ? `${distribution.medPct}%` : ''}
              </div>
              <div style={{ width: `${distribution.highPct}%` }} className="bg-[#EF4444] flex items-center justify-center text-[10px] font-bold text-white transition-all">
                {Number(distribution.highPct) > 10 ? `${distribution.highPct}%` : ''}
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-2 bg-white rounded border border-[#18181B]">
                <div className="flex items-center justify-center gap-1 font-bold text-[#065F46]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                  <span>Low Risk (&lt;0.30)</span>
                </div>
                <div className="text-sm font-black text-[#18181B] mt-1">{distribution.low} txns ({distribution.lowPct}%)</div>
              </div>

              <div className="p-2 bg-white rounded border border-[#18181B]">
                <div className="flex items-center justify-center gap-1 font-bold text-[#92400E]">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                  <span>Medium Risk (0.30–0.70)</span>
                </div>
                <div className="text-sm font-black text-[#18181B] mt-1">{distribution.med} txns ({distribution.medPct}%)</div>
              </div>

              <div className="p-2 bg-white rounded border border-[#18181B]">
                <div className="flex items-center justify-center gap-1 font-bold text-[#991B1B]">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                  <span>High Risk (&gt;0.70)</span>
                </div>
                <div className="text-sm font-black text-[#18181B] mt-1">{distribution.high} txns ({distribution.highPct}%)</div>
              </div>
            </div>
          </div>

          {/* Session Spikes & Injections Section */}
          <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#EF4444]" />
                <h4 className="font-bold text-[#18181B] text-xs uppercase">Detected Spikes In Current Session ({spikeFlags.length})</h4>
              </div>
              {activeSpikeAlert ? (
                <span className="neo-badge neo-badge-red text-[10px] animate-pulse">
                  ACTIVE ALERT IN PROGRESS
                </span>
              ) : (
                <span className="neo-badge neo-badge-green text-[10px]">
                  STEADY STATE
                </span>
              )}
            </div>

            {spikeFlags.length === 0 ? (
              <div className="py-8 text-center text-[#52525B] bg-white rounded-lg border border-dashed border-[#18181B] p-4">
                <CheckCircle className="w-6 h-6 text-[#10B981] mx-auto mb-1.5" />
                <p className="font-bold text-[#18181B]">No velocity spikes recorded in this session yet.</p>
                <p className="text-[11px] text-[#71717A] mt-0.5">Use the Attack Simulator Deck or 90s Story Mode to trigger real-time anomaly bursts.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {spikeFlags.map((flag, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-[#18181B] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded bg-[#FEE2E2] text-[#EF4444] border border-[#18181B]">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-black text-[#18181B] text-xs">
                          Spike Event #{flag.id}
                        </div>
                        <div className="text-[10px] text-[#52525B]">
                          Peak Deviation: <span className="font-bold text-[#EF4444]">+{flag.deviation_sigma?.toFixed(2)}σ</span> · EWMA Rate: <span className="font-bold text-[#18181B]">{((flag.score || 0) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`neo-badge text-[10px] ${flag.resolved ? 'neo-badge-blue' : 'neo-badge-red'}`}>
                        {flag.resolved ? 'RESOLVED' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Detector Configuration Telemetry */}
          <div className="p-4 bg-white rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] text-[#52525B] font-bold uppercase">Sliding Window</div>
              <div className="text-sm font-black text-[#18181B] mt-0.5">{config.window_size || 25} txns</div>
            </div>
            <div>
              <div className="text-[10px] text-[#52525B] font-bold uppercase">Z-Score Cutoff</div>
              <div className="text-sm font-black text-[#18181B] mt-0.5">+{config.z_threshold || 2.5}σ</div>
            </div>
            <div>
              <div className="text-[10px] text-[#52525B] font-bold uppercase">EWMA Smoothing (α)</div>
              <div className="text-sm font-black text-[#18181B] mt-0.5">{config.ewma_alpha || 0.10}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#52525B] font-bold uppercase">Base Risk Cutoff</div>
              <div className="text-sm font-black text-[#18181B] mt-0.5">{config.risk_cutoff || 0.50}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF6F0] border-t-2 border-[#18181B] flex items-center justify-between font-mono text-xs">
          <div className="text-[11px] text-[#52525B]">
            Pulse Sentinel Engine · Live Stream Memory Active
          </div>
          <button
            onClick={onClose}
            className="neo-btn neo-btn-white px-4 py-2"
          >
            Close Telemetry Report
          </button>
        </div>
      </div>
    </div>
  );
};
