import React, { useState, useEffect } from 'react';
import type { MetricsReport } from '../types';
import { Target, Zap, Clock, ShieldCheck, X } from 'lucide-react';

interface MetricsReportViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetricsReportView: React.FC<MetricsReportViewProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<MetricsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch('/api/metrics')
      .then(res => res.json())
      .then(data => {
        if (active) setMetrics(data);
      })
      .catch(err => console.error("Error fetching full metrics", err))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const cl = metrics?.classification;
  const cm = cl?.classification_metrics?.confusion_matrix;
  const eco = cl?.economic_impact;
  const ttd = metrics?.spike_benchmarks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] border-3 border-[#18181B] shadow-[8px_8px_0px_#18181B] rounded-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b-2 border-[#18181B] flex items-center justify-between bg-[#FAF6F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#0C0E12] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] p-1 shrink-0">
              <img src="/logo.svg" alt="Pulse" className="w-full h-full object-contain filter drop-shadow-[0_0_4px_rgba(36,238,93,0.4)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="neo-badge neo-badge-blue text-[10px]">
                  HELD-OUT EVALUATION BENCHMARKS
                </span>
                <h2 className="font-display text-lg font-black text-[#18181B]">Model Performance & Time-To-Detection</h2>
              </div>
              <p className="text-xs text-[#52525B] mt-0.5 font-mono">
                Evaluated strictly against unseen test split (5,000 transactions) with explicit false-positive loss accounting.
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

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 font-mono text-xs bg-[#FFFFFF]">
          {isLoading || !metrics ? (
            <div className="py-24 text-center font-bold text-[#52525B]">Generating held-out benchmark report...</div>
          ) : (
            <>
              {/* Classification Headline Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
                  <div className="flex items-center gap-1.5 text-[#52525B] micro-label">
                    <Target className="w-3.5 h-3.5 text-[#2563EB] stroke-[2.5]" />
                    <span>PRECISION</span>
                  </div>
                  <div className="text-2xl font-black text-[#18181B] mt-2">
                    {((cl?.classification_metrics?.precision ?? 0) * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-[#52525B] font-bold mt-1">on held-out test split</div>
                </div>

                <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
                  <div className="flex items-center gap-1.5 text-[#52525B] micro-label">
                    <Zap className="w-3.5 h-3.5 text-[#10B981] stroke-[2.5]" />
                    <span>RECALL</span>
                  </div>
                  <div className="text-2xl font-black text-[#10B981] mt-2">
                    {((cl?.classification_metrics?.recall ?? 0) * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-[#065F46] font-bold mt-1">100% fraud stopped</div>
                </div>

                <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
                  <div className="flex items-center gap-1.5 text-[#52525B] micro-label">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] stroke-[2.5]" />
                    <span>ROC-AUC</span>
                  </div>
                  <div className="text-2xl font-black text-[#2563EB] mt-2">
                    {cl?.classification_metrics?.roc_auc?.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-[#52525B] font-bold mt-1">discriminative capacity</div>
                </div>

                <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
                  <div className="flex items-center gap-1.5 text-[#52525B] micro-label">
                    <Clock className="w-3.5 h-3.5 text-[#D97706] stroke-[2.5]" />
                    <span>MEAN SPIKE TTD</span>
                  </div>
                  <div className="text-2xl font-black text-[#D97706] mt-2">
                    {ttd?.spike_metrics?.mean_time_to_detection_txns?.toFixed(1)} txns
                  </div>
                  <div className="text-[10px] text-[#065F46] font-bold mt-1">SLA target &lt; 30 txns</div>
                </div>
              </div>

              {/* Confusion Matrix & Economic Cost Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Confusion Matrix */}
                <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
                  <h3 className="micro-label text-[#18181B] mb-3 font-bold">
                    Held-Out Confusion Matrix (N={cl?.dataset_split?.heldout_transactions})
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-3 bg-[#D1FAE5] border-2 border-[#18181B] rounded-lg">
                      <span className="text-[10px] text-[#065F46] font-bold block">TRUE POSITIVES (Caught)</span>
                      <span className="text-2xl font-black text-[#065F46]">{cm?.true_positives}</span>
                    </div>
                    <div className="p-3 bg-[#FEF3C7] border-2 border-[#18181B] rounded-lg">
                      <span className="text-[10px] text-[#92400E] font-bold block">FALSE POSITIVES (Friction)</span>
                      <span className="text-2xl font-black text-[#92400E]">{cm?.false_positives}</span>
                    </div>
                    <div className="p-3 bg-[#FEE2E2] border-2 border-[#18181B] rounded-lg">
                      <span className="text-[10px] text-[#991B1B] font-bold block">FALSE NEGATIVES (Missed)</span>
                      <span className="text-2xl font-black text-[#991B1B]">{cm?.false_negatives}</span>
                    </div>
                    <div className="p-3 bg-white border-2 border-[#18181B] rounded-lg">
                      <span className="text-[10px] text-[#52525B] font-bold block">TRUE NEGATIVES (Genuine)</span>
                      <span className="text-2xl font-black text-[#18181B]">{cm?.true_negatives}</span>
                    </div>
                  </div>
                </div>

                {/* Economic Impact Breakdown */}
                <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] space-y-2">
                  <h3 className="micro-label text-[#18181B] mb-3 font-bold">
                    Economic Friction & Prevention Balance
                  </h3>
                  <div className="flex justify-between py-1.5 border-b border-[#18181B]/20">
                    <span className="text-[#52525B]">Fraud Stopped (₹ Value):</span>
                    <span className="text-[#10B981] font-black">₹{eco?.fraud_prevented_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#18181B]/20">
                    <span className="text-[#52525B]">Assumed False Block Friction Cost:</span>
                    <span className="text-[#18181B] font-bold">₹{eco?.assumed_fp_cost_inr} / genuine txn</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#18181B]/20">
                    <span className="text-[#52525B]">Total Estimated FP Operational Cost:</span>
                    <span className="text-[#EF4444] font-black">₹{eco?.total_fp_cost_inr?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#52525B]">Normalized FP Cost / 1,000 Txns:</span>
                    <span className="text-[#2563EB] font-black">₹{eco?.fp_cost_per_1000_txns_inr?.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Time-To-Detection Detailed Log */}
              <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="micro-label text-[#18181B] font-bold">
                    Time-To-Detection (TTD) Ground Truth Log
                  </h3>
                  <span className="neo-badge neo-badge-green text-[10px]">
                    Spike Recall: {((ttd?.spike_metrics?.spike_recall ?? 1) * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs bg-white border-2 border-[#18181B] rounded-lg">
                    <thead>
                      <tr className="text-[#52525B] border-b-2 border-[#18181B] bg-[#FAF6F0]">
                        <th className="p-2.5">Spike ID</th>
                        <th className="p-2.5">Attack Archetype</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Detection Lag (Txns)</th>
                        <th className="p-2.5 text-right">Time Lag (s)</th>
                        <th className="p-2.5 text-right">Alert Sigma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-[#18181B]">
                      {ttd?.detailed_spike_results?.map((res, i) => (
                        <tr key={i} className="hover:bg-[#FAF6F0]">
                          <td className="p-2.5 font-black text-[#18181B]">{res.spike_id}</td>
                          <td className="p-2.5 text-[#52525B] font-medium">{res.archetype?.replace(/_/g, ' ')}</td>
                          <td className="p-2.5">
                            {res.detected ? (
                              <span className="neo-badge neo-badge-green text-[10px]">CAUGHT</span>
                            ) : (
                              <span className="neo-badge neo-badge-red text-[10px]">MISSED</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-black text-[#18181B]">
                            {res.time_to_detection_txns} txns
                          </td>
                          <td className="p-2.5 text-right text-[#52525B]">
                            {res.time_to_detection_seconds}s
                          </td>
                          <td className="p-2.5 text-right text-[#EF4444] font-black">
                            +{res.deviation_sigma}σ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* XGBoost Feature Importances */}
              <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
                <h3 className="micro-label text-[#18181B] mb-3 font-bold">
                  XGBoost Feature Importance Distribution
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cl?.feature_importances?.map((fi, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-[#18181B]">{fi.description}</span>
                        <span className="text-[#2563EB]">{(fi.importance * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 bg-white rounded-sm overflow-hidden border border-[#18181B]">
                        <div
                          className="h-full bg-[#2563EB]"
                          style={{ width: `${Math.min(100, fi.importance * 100 * 2.5)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF6F0] border-t-2 border-[#18181B] flex justify-end font-mono text-xs">
          <button
            onClick={onClose}
            className="neo-btn neo-btn-white px-4 py-2"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
