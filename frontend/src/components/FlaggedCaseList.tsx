import React, { useState } from 'react';
import type { SpikeFlag, ExplanationResponse } from '../types';
import { AlertCircle, AlertTriangle, CheckCircle2, XCircle, Sparkles, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Shield, History } from 'lucide-react';

interface FlaggedCaseListProps {
  flags: SpikeFlag[];
  onTakeAction: (flagId: string, action: string) => Promise<void>;
  onOpenActionReport?: () => void;
}

export const FlaggedCaseList: React.FC<FlaggedCaseListProps> = ({ flags, onTakeAction, onOpenActionReport }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, ExplanationResponse['explanation']>>({});
  const [loadingExpl, setLoadingExpl] = useState<Record<string, boolean>>({});
  const [feedbackSent, setFeedbackSent] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const toggleExpand = async (flag: SpikeFlag) => {
    if (expandedId === flag.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(flag.id);
    if (!explanations[flag.id]) {
      setLoadingExpl(prev => ({ ...prev, [flag.id]: true }));
      try {
        const res = await fetch(`/api/flags/${flag.id}/explain`);
        if (res.ok) {
          const data: ExplanationResponse = await res.json();
          setExplanations(prev => ({ ...prev, [flag.id]: data.explanation }));
        }
      } catch (err) {
        console.error('Error loading explanation', err);
      } finally {
        setLoadingExpl(prev => ({ ...prev, [flag.id]: false }));
      }
    }
  };

  const handleFeedback = async (flagId: string, rating: 'helpful' | 'unhelpful') => {
    try {
      await fetch(`/api/flags/${flagId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      setFeedbackSent(prev => ({ ...prev, [flagId]: rating }));
    } catch (e) {
      console.error('Feedback error', e);
    }
  };

  const filteredFlags = flags.filter(f => {
    if (filter === 'open') return !f.resolved;
    if (filter === 'resolved') return f.resolved;
    return true;
  });

  const openCount = flags.filter(f => !f.resolved).length;

  return (
    <div className="bg-white p-4 border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] rounded-xl flex flex-col min-h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-3 border-b-2 border-[#18181B]">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-sm tracking-wider uppercase text-[#18181B]">
            FLAGGED CASES
          </span>
          {openCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEE2E2] text-[#991B1B] border-2 border-[#18181B] rounded font-mono font-black text-[11px]">
              {openCount} OPEN
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] border-2 border-[#18181B] rounded font-mono font-black text-[11px]">
              ALL CLEAR
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 font-mono text-[11px] bg-[#FAF6F0] p-1 border-2 border-[#18181B] rounded-lg">
            {(['all', 'open', 'resolved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors capitalize ${
                  filter === tab
                    ? tab === 'open'
                      ? 'bg-[#EF4444] text-white'
                      : tab === 'resolved'
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#18181B] text-white'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                {tab === 'all' ? `All (${flags.length})` : tab === 'open' ? `Open (${openCount})` : 'Resolved'}
              </button>
            ))}
          </div>

          {onOpenActionReport && (
            <button
              onClick={onOpenActionReport}
              className="neo-btn neo-btn-white px-2.5 py-1 text-[11px] font-bold text-[#18181B] flex items-center gap-1 font-mono"
              title="View Full Action Report & Decision History"
            >
              <History className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Action Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Case List */}
      <div className="custom-scrollbar overflow-y-auto flex-1 space-y-2 pr-0.5" style={{ maxHeight: '520px' }}>
        {filteredFlags.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-xs font-mono text-[#52525B] bg-[#FAF6F0] border-2 border-dashed border-[#A1A1AA] rounded-lg">
            <Shield className="w-8 h-8 text-[#10B981]" />
            <p className="font-bold text-[#18181B]">No cases match this filter.</p>
            <p className="text-[11px] text-[#71717A]">Stream is monitoring risk metrics.</p>
          </div>
        ) : (
          filteredFlags.map(flag => {
            const isExpanded = expandedId === flag.id;
            const isSpike = flag.type === 'spike';
            const explanation = explanations[flag.id];
            const isLoading = loadingExpl[flag.id];
            const scoreVal = flag.score ?? (isSpike ? 0.94 : 0.72);

            // Determine card colour scheme
            const cardBg = flag.resolved ? '#FAF6F0' : isSpike ? '#FFF5F5' : '#FFFDF5';
            const shadowColor = flag.resolved ? '#18181B' : isSpike ? '#EF4444' : '#F59E0B';
            const badgeBg = flag.resolved ? '#E4E4E7' : isSpike ? '#FEE2E2' : '#FEF3C7';
            const badgeText = flag.resolved ? '#52525B' : isSpike ? '#991B1B' : '#92400E';
            const iconBg = isSpike ? '#FEE2E2' : '#FEF3C7';
            const iconColor = isSpike ? '#EF4444' : '#D97706';

            return (
              <div
                key={flag.id}
                style={{
                  backgroundColor: cardBg,
                  boxShadow: `3px 3px 0px ${shadowColor}`,
                }}
                className="border-2 border-[#18181B] rounded-lg"
              >
                {/* Summary Row — always visible */}
                <div
                  onClick={() => toggleExpand(flag)}
                  className="flex items-center justify-between gap-3 p-3 cursor-pointer select-none hover:bg-black/[0.025] transition-colors rounded-lg"
                  style={{ minHeight: '56px' }}
                >
                  {/* Left: icon + text */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icon badge */}
                    <div
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded border border-[#18181B]"
                      style={{ backgroundColor: iconBg, color: iconColor }}
                    >
                      {isSpike
                        ? <AlertCircle className="w-4 h-4" style={{ color: iconColor }} strokeWidth={2.5} />
                        : <AlertTriangle className="w-4 h-4" style={{ color: iconColor }} strokeWidth={2.5} />
                      }
                    </div>

                    {/* Text block */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-[#18181B] whitespace-nowrap">
                          {isSpike ? 'SPIKE' : 'ANOMALY'} #{flag.id}
                        </span>
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 border border-[#18181B] rounded font-mono font-bold text-[10px] whitespace-nowrap"
                          style={{ backgroundColor: badgeBg, color: badgeText }}
                        >
                          {flag.resolved
                            ? `✓ ${flag.resolved_action || 'resolved'}`
                            : isSpike
                            ? `+${flag.deviation_sigma}σ`
                            : `Score ${(scoreVal * 100).toFixed(0)}%`}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[#52525B] mt-0.5 truncate">
                        Txn #{flag.first_anomalous_txn_id} · {flag.detected_at ? new Date(flag.detected_at).toLocaleTimeString() : 'Just now'}
                      </div>
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="shrink-0">
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-[#18181B]" strokeWidth={2.5} />
                      : <ChevronDown className="w-4 h-4 text-[#18181B]" strokeWidth={2.5} />
                    }
                  </div>
                </div>

                {/* Expanded Diagnosis Panel */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 border-t-2 border-[#18181B] bg-white rounded-b-lg text-xs font-mono space-y-3">
                    {/* Confidence Bar */}
                    <div>
                      <div className="flex justify-between font-bold text-[11px] mb-1">
                        <span className="text-[#52525B]">Anomaly Confidence</span>
                        <span style={{ color: isSpike ? '#EF4444' : '#D97706' }}>
                          {(scoreVal * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F4F4F5] border border-[#18181B] rounded-sm overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${scoreVal * 100}%`,
                            backgroundColor: isSpike ? '#EF4444' : '#F59E0B',
                          }}
                        />
                      </div>
                    </div>

                    {/* Contributing Features */}
                    {flag.features && flag.features.length > 0 && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#52525B] mb-1.5">
                          Primary Detection Signals
                        </div>
                        <div className="space-y-1">
                          {flag.features.map((feat, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 bg-[#FAF6F0] border border-[#18181B] rounded p-2"
                            >
                              <span className="text-[#18181B] text-[11px] font-medium truncate">
                                {feat.detail || feat.description}
                              </span>
                              <span className="shrink-0 px-1.5 py-0.5 bg-[#DBEAFE] text-[#1E40AF] border border-[#18181B] rounded font-mono font-bold text-[10px]">
                                {(feat.weight * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Synthesis */}
                    <div className="bg-[#FAF6F0] border-2 border-[#18181B] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[#2563EB] font-bold text-[11px] uppercase mb-1.5">
                        <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Risk Synthesis ({explanation?.engine || 'Pulse Explainer'})</span>
                      </div>
                      {isLoading ? (
                        <p className="text-[#52525B] italic text-xs animate-pulse">Generating explanation...</p>
                      ) : explanation ? (
                        <div className="space-y-2">
                          <p className="text-[#18181B] leading-relaxed text-xs">{explanation.summary}</p>
                          <div className="pt-1.5 border-t border-[#18181B]/20 text-[11px] text-[#2563EB] font-bold">
                            → {explanation.recommendation}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[#52525B] text-xs">
                          Rolling risk deviation (+{flag.deviation_sigma}σ) exceeded the +2.5σ threshold.
                        </p>
                      )}
                    </div>

                    {/* Action Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#18181B]/20">
                      {flag.resolved ? (
                        <div className="flex items-center gap-1.5 bg-[#D1FAE5] border border-[#18181B] rounded px-2 py-1 text-[#065F46] font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Logged: {flag.resolved_action?.toUpperCase()}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onTakeAction(flag.id, 'act')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded font-bold text-xs cursor-pointer transition-all hover:-translate-x-px hover:-translate-y-px"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Enforce Step-Up
                          </button>
                          <button
                            onClick={() => onTakeAction(flag.id, 'dismiss')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF6F0] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded font-bold text-xs cursor-pointer transition-all hover:-translate-x-px hover:-translate-y-px"
                          >
                            <XCircle className="w-3.5 h-3.5 text-[#52525B]" />
                            Dismiss
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-[#52525B]">
                        <span>Helpful?</span>
                        <button
                          onClick={() => handleFeedback(flag.id, 'helpful')}
                          title="Helpful"
                          className={`p-1 border border-[#18181B] rounded cursor-pointer ${
                            feedbackSent[flag.id] === 'helpful' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FAF6F0] hover:bg-[#D1FAE5]'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(flag.id, 'unhelpful')}
                          title="Unhelpful"
                          className={`p-1 border border-[#18181B] rounded cursor-pointer ${
                            feedbackSent[flag.id] === 'unhelpful' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#FAF6F0] hover:bg-[#FEE2E2]'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
