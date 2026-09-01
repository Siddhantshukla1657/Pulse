import React, { useMemo } from 'react';
import type { VitalsPoint, SpikeFlag } from '../types';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface PulseChartProps {
  vitals: VitalsPoint[];
  activeAlert: SpikeFlag | null;
  windowSize: number;
}

export const PulseChart: React.FC<PulseChartProps> = ({ vitals, activeAlert, windowSize }) => {
  const current = vitals[vitals.length - 1];
  const inSpike = Boolean(activeAlert) || (current?.in_spike ?? false);
  const isCalibrated = current?.is_calibrated ?? false;

  const currentRate = (current?.current_risk_rate ?? 0) * 100;
  const baselineRate = (current?.baseline_ewma ?? 0.02) * 100;
  const zScore = current?.z_score ?? 0;

  // Chart canvas coordinates
  const width = 860;
  const height = 240;
  const padding = { top: 28, right: 40, bottom: 32, left: 40 };

  const { areaData, baselineY, headPoint, trailSegments } = useMemo(() => {
    if (vitals.length < 2) {
      return { areaData: '', baselineY: height / 2, headPoint: null, trailSegments: [] };
    }

    const rates = vitals.map(v => v.current_risk_rate);
    const maxVal = Math.max(0.35, ...rates, (current?.baseline_ewma || 0.02) * 2.5);
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const points = vitals.map((v, i) => {
      const x = padding.left + (i / (vitals.length - 1)) * plotW;
      const normalizedY = Math.min(1, Math.max(0, v.current_risk_rate / maxVal));
      const y = height - padding.bottom - normalizedY * plotH;
      return { x, y, inSpike: v.in_spike || v.z_score >= 2.5 };
    });

    let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX.toFixed(1)} ${p0.y.toFixed(1)}, ${cpX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }

    const first = points[0];
    const last = points[points.length - 1];
    const baseY = height - padding.bottom;
    const area = `${path} L ${last.x.toFixed(1)} ${baseY} L ${first.x.toFixed(1)} ${baseY} Z`;

    const normBase = Math.min(1, Math.max(0, (current?.baseline_ewma || 0.02) / maxVal));
    const calculatedBaseY = height - padding.bottom - normBase * plotH;

    // Build segments
    const segments: Array<{ d: string; isAlert: boolean; opacity: number }> = [];
    const segCount = 4;
    const chunkSize = Math.max(1, Math.floor(points.length / segCount));
    for (let s = 0; s < segCount; s++) {
      const startIdx = s * chunkSize;
      const endIdx = s === segCount - 1 ? points.length - 1 : Math.min(points.length - 1, (s + 1) * chunkSize);
      if (startIdx >= endIdx) continue;

      let segPath = `M ${points[startIdx].x.toFixed(1)} ${points[startIdx].y.toFixed(1)}`;
      let segmentHasSpike = false;
      for (let j = startIdx; j < endIdx; j++) {
        const p0 = points[j];
        const p1 = points[j + 1];
        if (p0.inSpike || p1.inSpike) segmentHasSpike = true;
        const cpX = (p0.x + p1.x) / 2;
        segPath += ` C ${cpX.toFixed(1)} ${p0.y.toFixed(1)}, ${cpX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      }
      const opacity = 0.5 + 0.5 * ((s + 1) / segCount);
      segments.push({ d: segPath, opacity, isAlert: segmentHasSpike });
    }

    return { areaData: area, baselineY: calculatedBaseY, headPoint: last, trailSegments: segments };
  }, [vitals, current, height, width, padding.left, padding.right, padding.top, padding.bottom]);

  return (
    <div
      className={`bg-white p-5 border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] rounded-xl flex flex-col justify-between transition-all ${
        inSpike ? 'pulse-border-alert' : ''
      }`}
    >
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="neo-badge neo-badge-dark text-[10px]">
              ROLLING RISK VITALS MONITOR
            </span>
            {!isCalibrated && (
              <span className="neo-badge neo-badge-amber text-[10px]">
                CALIBRATING ({vitals.length}/{windowSize})
              </span>
            )}
          </div>

          <div className="mt-2">
            {inSpike ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FEE2E2] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-lg text-[#EF4444]">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#EF4444]"></span>
                </span>
                <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#EF4444] uppercase">
                  ARRHYTHMIA ALERT: COORDINATED SPIKE
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D1FAE5] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-lg text-[#065F46]">
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
                </span>
                <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#18181B]">
                  Normal Sinus Rhythm
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Indicator Badges */}
        <div className="flex items-center gap-2 sm:gap-3 font-mono">
          <div className="bg-[#FAF6F0] px-3.5 py-2 border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-lg">
            <span className="text-[#52525B] block text-[10px] font-bold uppercase">CURRENT RATE</span>
            <span
              className={`text-lg font-black ${
                inSpike ? 'text-[#EF4444]' : currentRate > 15 ? 'text-[#D97706]' : 'text-[#18181B]'
              }`}
            >
              {currentRate.toFixed(1)}%
            </span>
          </div>

          <div className="bg-[#FAF6F0] px-3.5 py-2 border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-lg">
            <span className="text-[#52525B] block text-[10px] font-bold uppercase">EWMA BASELINE</span>
            <span className="text-lg font-black text-[#52525B]">
              {baselineRate.toFixed(1)}%
            </span>
          </div>

          <div className="bg-[#FAF6F0] px-3.5 py-2 border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-lg">
            <span className="text-[#52525B] block text-[10px] font-bold uppercase">DEVIATION</span>
            <span
              className={`text-lg font-black ${
                zScore >= 2.5 ? 'text-[#EF4444]' : zScore >= 1.8 ? 'text-[#D97706]' : 'text-[#10B981]'
              }`}
            >
              {zScore >= 0 ? `+${zScore.toFixed(1)}σ` : `${zScore.toFixed(1)}σ`}
            </span>
          </div>
        </div>
      </div>

      {/* Oscilloscope Graph Area */}
      <div className="relative w-full h-[230px] rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] oscilloscope-neo-bg overflow-hidden flex items-center justify-center">
        {vitals.length < 2 ? (
          <div className="flex flex-col items-center gap-2 text-[#52525B] font-mono text-xs font-bold">
            <div className="w-4 h-4 rounded-full bg-[#2563EB] animate-ping opacity-60"></div>
            <span>Calibrating EWMA rolling risk sweep...</span>
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="neoSinusGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="neoSpikeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid baseline lines */}
            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="#18181B"
              strokeWidth="1.5"
            />
            <line
              x1={padding.left}
              y1={padding.top}
              x2={width - padding.right}
              y2={padding.top}
              stroke="#A1A1AA"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {/* Dashed EWMA Baseline Guide */}
            <line
              x1={padding.left}
              y1={baselineY}
              x2={width - padding.right}
              y2={baselineY}
              stroke="#71717A"
              strokeDasharray="5 4"
              strokeWidth="1.5"
            />
            <rect
              x={width - padding.right - 142}
              y={baselineY - 18}
              width="138"
              height="18"
              fill="#FFFFFF"
              stroke="#18181B"
              strokeWidth="1.5"
              rx="3"
            />
            <text
              x={width - padding.right - 134}
              y={baselineY - 5}
              fill="#18181B"
              fontSize="10"
              fontFamily="Space Mono, monospace"
              fontWeight="bold"
            >
              EWMA Baseline: {baselineRate.toFixed(1)}%
            </text>

            {/* Shaded Area Under Curve */}
            <path
              d={areaData}
              fill={inSpike ? 'url(#neoSpikeGrad)' : 'url(#neoSinusGrad)'}
              className="transition-all duration-300"
            />

            {/* Oscilloscope Segments */}
            {trailSegments.map((seg, idx) => (
              <path
                key={idx}
                d={seg.d}
                fill="none"
                stroke={seg.isAlert || inSpike ? '#EF4444' : '#10B981'}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={seg.opacity}
              />
            ))}

            {/* Forward Sweep Pen Head Point */}
            {headPoint && (
              <g transform={`translate(${headPoint.x}, ${headPoint.y})`}>
                <circle
                  r={inSpike ? 9 : 7}
                  fill={inSpike ? '#EF4444' : '#10B981'}
                  opacity="0.35"
                  className={inSpike ? 'animate-ping' : ''}
                />
                <circle
                  r={inSpike ? 5 : 4}
                  fill={inSpike ? '#EF4444' : '#10B981'}
                  stroke="#18181B"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Footer System Spec Strip */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between text-xs font-mono text-[#52525B] gap-2 pt-2 border-t border-[#18181B]/20">
        <div className="flex items-center gap-3">
          <span>
            Window: <strong className="text-[#18181B]">{windowSize} txns</strong>
          </span>
          <span>·</span>
          <span>
            Rule: <strong className="text-[#18181B]">EWMA + Z-Score (&gt; 2.5σ)</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {inSpike ? (
            <span className="neo-badge neo-badge-red text-[10px]">
              <AlertTriangle className="w-3 h-3" /> Velocity breakout active
            </span>
          ) : (
            <span className="neo-badge neo-badge-green text-[10px]">
              <ShieldCheck className="w-3 h-3" /> Baseline within safe limits
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
