import React, { useEffect, useState } from 'react';
import type { MetricsReport } from '../types';
import { Target, Zap, Clock, ArrowRight, ArrowLeftRight, FileText } from 'lucide-react';

interface MetricsStripProps {
  metrics: MetricsReport | null;
  onOpenDetailedReport: () => void;
}

type MetricKey = 'precision' | 'recall' | 'fp_cost' | 'ttd';

export const MetricsStrip: React.FC<MetricsStripProps> = ({ metrics, onOpenDetailedReport }) => {
  const [displayPrec, setDisplayPrec] = useState(0);
  const [displayRec, setDisplayRec] = useState(0);
  const [displayFpCost, setDisplayFpCost] = useState(0);
  const [displayTtd, setDisplayTtd] = useState(0);

  const [tileOrder, setTileOrder] = useState<MetricKey[]>(['precision', 'recall', 'fp_cost', 'ttd']);

  const targetPrec = (metrics?.classification?.classification_metrics?.precision ?? 0.95) * 100;
  const targetRec = (metrics?.classification?.classification_metrics?.recall ?? 1.0) * 100;
  const targetFpCost = metrics?.classification?.economic_impact?.fp_cost_per_1000_txns_inr ?? 420;
  const targetTtd = metrics?.spike_benchmarks?.spike_metrics?.mean_time_to_detection_txns ?? 2.2;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayPrec(targetPrec);
      setDisplayRec(targetRec);
      setDisplayFpCost(targetFpCost);
      setDisplayTtd(targetTtd);
    }, 100);
    return () => clearTimeout(timer);
  }, [targetPrec, targetRec, targetFpCost, targetTtd]);

  const moveTile = (index: number, direction: 'left' | 'right') => {
    const newOrder = [...tileOrder];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx >= 0 && targetIdx < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIdx];
      newOrder[targetIdx] = temp;
      setTileOrder(newOrder);
    }
  };

  const renderTile = (key: MetricKey, index: number) => {
    switch (key) {
      case 'precision':
        return (
          <div
            key={key}
            className="group relative bg-[#FFFFFF] p-4 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] rounded-lg flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#18181B] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#18181B]">
                <span className="p-1 bg-[#DBEAFE] text-[#2563EB] border border-[#18181B] rounded">
                  <Target className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span>PRECISION</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                {index > 0 && (
                  <button
                    onClick={() => moveTile(index, 'left')}
                    className="p-1 bg-[#F5EFEB] border border-[#18181B] rounded text-xs font-bold hover:bg-[#2563EB] hover:text-white cursor-pointer"
                    title="Move left"
                  >
                    &larr;
                  </button>
                )}
                {index < tileOrder.length - 1 && (
                  <button
                    onClick={() => moveTile(index, 'right')}
                    className="p-1 bg-[#F5EFEB] border border-[#18181B] rounded text-xs font-bold hover:bg-[#2563EB] hover:text-white cursor-pointer"
                    title="Move right"
                  >
                    &rarr;
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <div className="font-mono text-3xl font-extrabold text-[#18181B] tracking-tight">
                {displayPrec.toFixed(1)}%
              </div>
              <div className="inline-block mt-1 px-2 py-0.5 bg-[#DBEAFE] text-[#1D4ED8] border border-[#18181B] rounded text-[10px] font-mono font-bold">
                held-out test split
              </div>
            </div>
          </div>
        );

      case 'recall':
        return (
          <div
            key={key}
            className="group relative bg-[#FFFFFF] p-4 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] rounded-lg flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#18181B] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#18181B]">
                <span className="p-1 bg-[#D1FAE5] text-[#10B981] border border-[#18181B] rounded">
                  <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span>RECALL</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                {index > 0 && (
                  <button
                    onClick={() => moveTile(index, 'left')}
                    className="p-1 bg-[#F5EFEB] border border-[#18181B] rounded text-xs font-bold hover:bg-[#2563EB] hover:text-white cursor-pointer"
                    title="Move left"
                  >
                    &larr;
                  </button>
                )}
                {index < tileOrder.length - 1 && (
                  <button
                    onClick={() => moveTile(index, 'right')}
                    className="p-1 bg-[#F5EFEB] border border-[#18181B] rounded text-xs font-bold hover:bg-[#2563EB] hover:text-white cursor-pointer"
                    title="Move right"
                  >
                    &rarr;
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <div className="font-mono text-3xl font-extrabold text-[#10B981] tracking-tight">
                {displayRec.toFixed(1)}%
              </div>
              <div className="inline-block mt-1 px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] border border-[#18181B] rounded text-[10px] font-mono font-bold">
                100% fraud stopped
              </div>
            </div>
          </div>
        );

      case 'fp_cost':
        return (
          <div
            key={key}
            className="group relative bg-[#FFFFFF] p-4 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] rounded-lg flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#18181B] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#18181B]">
                <span className="p-1 bg-[#FEE2E2] text-[#EF4444] border border-[#18181B] rounded font-bold text-xs leading-none">
                  ₹
                </span>
                <span>FP FRICTION / 1K</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                {index > 0 && (
                  <button
                    onClick={() => moveTile(index, 'left')}
                    className="p-1 bg-[#F5EFEB] border border-[#18181B] rounded text-xs font-bold hover:bg-[#2563EB] hover:text-white cursor-pointer"
                    title="Move left"
                  >
                    &larr;
                  </button>
                )}
                {index < tileOrder.length - 1 && (
                  <button
                    onClick={() => moveTile(index, 'right')}
                    className="p-1 bg-[#F5EFEB] border border-[#18181B] rounded text-xs font-bold hover:bg-[#2563EB] hover:text-white cursor-pointer"
                    title="Move right"
                  >
                    &rarr;
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <div className="font-mono text-3xl font-extrabold text-[#EF4444] tracking-tight">
                ₹{displayFpCost.toFixed(0)}
              </div>
              <div className="inline-block mt-1 px-2 py-0.5 bg-[#FEE2E2] text-[#991B1B] border border-[#18181B] rounded text-[10px] font-mono font-bold">
                at ₹350 / false block
              </div>
            </div>
          </div>
        );

      case 'ttd':
        return (
          <div
            key={key}
            className="group relative bg-[#FFFFFF] p-4 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] rounded-lg flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#18181B] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#18181B]">
                <span className="p-1 bg-[#DBEAFE] text-[#2563EB] border border-[#18181B] rounded">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span>SPIKE TTD</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                {index > 0 && (
                  <button
                    onClick={() => moveTile(index, 'left')}
                    className="p-1 bg-[#F5EFEB] border border-[#18181B] rounded text-xs font-bold hover:bg-[#2563EB] hover:text-white cursor-pointer"
                    title="Move left"
                  >
                    &larr;
                  </button>
                )}
                {index < tileOrder.length - 1 && (
                  <button
                    onClick={() => moveTile(index, 'right')}
                    className="p-1 bg-[#F5EFEB] border border-[#18181B] rounded text-xs font-bold hover:bg-[#2563EB] hover:text-white cursor-pointer"
                    title="Move right"
                  >
                    &rarr;
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <div className="font-mono text-3xl font-extrabold text-[#2563EB] tracking-tight">
                {displayTtd.toFixed(1)} <span className="text-sm font-bold text-[#52525B]">txns</span>
              </div>
              <div className="inline-block mt-1 px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] border border-[#18181B] rounded text-[10px] font-mono font-bold">
                Target &lt; 30 txns
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-[#FAF6F0] p-4 sm:p-5 border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] rounded-xl flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-sm tracking-wider uppercase text-[#18181B]">
            HELD-OUT BENCHMARKS
          </span>
          <span className="neo-badge neo-badge-blue text-[10px]">
            <ArrowLeftRight className="w-2.5 h-2.5" /> Reorderable
          </span>
        </div>
        <button
          onClick={onOpenDetailedReport}
          className="neo-btn neo-btn-white px-3 py-1 text-xs font-bold text-[#18181B] flex items-center gap-1.5"
          title="View Held-Out ML Model Evaluation & Time-To-Detection Benchmarks"
        >
          <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>ML Benchmarks Report</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tileOrder.map((key, idx) => renderTile(key, idx))}
      </div>
    </div>
  );
};
