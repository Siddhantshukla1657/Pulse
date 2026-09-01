import React, { useState, useEffect } from 'react';
import type { ShowcaseCase } from '../types';
import { ShieldAlert, ShieldCheck, Sparkles, X } from 'lucide-react';

interface ShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShowcaseModal: React.FC<ShowcaseModalProps> = ({ isOpen, onClose }) => {
  const [tpCase, setTpCase] = useState<ShowcaseCase | null>(null);
  const [fpCase, setFpCase] = useState<ShowcaseCase | null>(null);
  const [activeTab, setActiveTab] = useState<'tp' | 'fp'>('tp');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch('/api/showcase')
      .then(res => res.json())
      .then(data => {
        if (active) {
          if (data.true_positive) setTpCase(data.true_positive);
          if (data.false_positive) setFpCase(data.false_positive);
        }
      })
      .catch(err => console.error("Error loading showcase cases", err))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCase = activeTab === 'tp' ? tpCase : fpCase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] border-3 border-[#18181B] shadow-[8px_8px_0px_#18181B] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b-2 border-[#18181B] flex items-center justify-between bg-[#FAF6F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#0C0E12] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] p-1 shrink-0">
              <img src="/logo.svg" alt="Pulse" className="w-full h-full object-contain filter drop-shadow-[0_0_4px_rgba(36,238,93,0.4)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="neo-badge neo-badge-blue text-[10px]">
                  PITCH SHOWCASE WALKTHROUGH
                </span>
                <span className="font-display text-lg font-black text-[#18181B]">Honest Case Duality</span>
              </div>
              <p className="text-xs text-[#52525B] mt-1 font-mono">
                Held-out test split predictions: one caught fraudulent attack vs. one transparently audited false positive.
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

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-3 bg-[#FAF6F0] border-b-2 border-[#18181B] gap-3 text-xs font-mono">
          <button
            onClick={() => setActiveTab('tp')}
            className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all border-2 border-[#18181B] ${
              activeTab === 'tp'
                ? 'bg-[#FEE2E2] text-[#991B1B] shadow-[3px_3px_0px_#18181B] font-bold'
                : 'bg-white text-[#52525B] hover:bg-[#FFF5F5]'
            }`}
          >
            <ShieldAlert className="w-5 h-5 text-[#EF4444] stroke-[2]" />
            <div className="text-left">
              <div className="font-bold text-sm text-[#18181B]">Case A: Caught Fraud (True Positive)</div>
              <div className="text-[10px] text-[#52525B]">Model Score: 89% · Ground Truth: Coordinated Attack</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('fp')}
            className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all border-2 border-[#18181B] ${
              activeTab === 'fp'
                ? 'bg-[#FEF3C7] text-[#92400E] shadow-[3px_3px_0px_#18181B] font-bold'
                : 'bg-white text-[#52525B] hover:bg-[#FFFDF5]'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-[#D97706] stroke-[2]" />
            <div className="text-left">
              <div className="font-bold text-sm text-[#18181B]">Case B: Borderline Legitimate (False Positive)</div>
              <div className="text-[10px] text-[#52525B]">Model Score: 62% · Ground Truth: Genuine Customer</div>
            </div>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 font-mono text-xs bg-[#FFFFFF]">
          {isLoading || !currentCase ? (
            <div className="py-20 text-center font-mono text-xs text-[#52525B] font-bold">Loading showcase case data...</div>
          ) : (
            <>
              {/* Transaction Metadata Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
                <div>
                  <span className="micro-label text-[#52525B] block">TRANSACTION ID</span>
                  <span className="text-[#18181B] font-black text-sm">#{currentCase.txn?.txn_id}</span>
                </div>
                <div>
                  <span className="micro-label text-[#52525B] block">AMOUNT</span>
                  <span className="text-[#18181B] font-black text-sm">₹{currentCase.txn?.amount?.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="micro-label text-[#52525B] block">PAYMENT METHOD</span>
                  <span className="text-[#18181B] font-bold text-sm">{currentCase.txn?.payment_method}</span>
                </div>
                <div>
                  <span className="micro-label text-[#52525B] block">PREDICTED RISK SCORE</span>
                  <span className={`font-black text-base ${activeTab === 'tp' ? 'text-[#EF4444]' : 'text-[#D97706]'}`}>
                    {(currentCase.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* SHAP Feature Attributions */}
              <div>
                <h4 className="micro-label text-[#52525B] mb-2 font-bold">
                  SHAP Local Feature Attribution
                </h4>
                <div className="space-y-2">
                  {currentCase.top_features?.map((f, i) => (
                    <div key={i} className="bg-[#FAF6F0] p-3 rounded-lg border-2 border-[#18181B] flex items-center justify-between">
                      <div>
                        <div className="text-xs text-[#18181B] font-bold">{f.detail}</div>
                        <div className="text-[11px] text-[#52525B] mt-0.5">{f.description}</div>
                      </div>
                      <div className="neo-badge neo-badge-blue text-xs font-bold">
                        +{(f.weight * 100).toFixed(1)}% SHAP
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Natural Language Synthesis & Honest Tradeoff Discussion */}
              <div className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] space-y-3">
                <div className="flex items-center gap-2 text-[#2563EB] font-bold">
                  <Sparkles className="w-4 h-4 stroke-[2]" />
                  <span>Defense-Only Plain Language Explanation</span>
                </div>
                <p className="text-[#18181B] leading-relaxed font-body text-xs">{currentCase.explanation_summary}</p>
                
                <div className="pt-3 border-t-2 border-[#18181B]">
                  <span className="micro-label text-[#52525B] block mb-1">Architectural Tradeoff Note</span>
                  {activeTab === 'tp' ? (
                    <p className="text-[#52525B] text-[11px] font-body">
                      High multi-factor correlation allows early auto-interception of ATO and bot testing rings before chargeback initiation.
                    </p>
                  ) : (
                    <p className="text-[#92400E] text-[11px] font-body font-semibold">
                      By setting a strict fraud threshold to achieve 100% recall, this genuine user incurred a step-up challenge (~₹350 friction cost). 
                      Pulse reports this cost transparently rather than artificially suppressing false positive metrics.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#FAF6F0] border-t-2 border-[#18181B] flex justify-end font-mono text-xs">
          <button
            onClick={onClose}
            className="neo-btn neo-btn-white px-4 py-2"
          >
            Close Walkthrough
          </button>
        </div>
      </div>
    </div>
  );
};
