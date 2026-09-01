import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, X } from 'lucide-react';

interface StoryModeWalkthroughProps {
  isActive: boolean;
  onClose: () => void;
  onInjectSpike: (archetype: string) => void;
  onOpenMetricsReport: () => void;
  onOpenShowcase: () => void;
}

interface StoryStep {
  id: number;
  title: string;
  durationSeconds: number;
  badge: string;
  description: string;
  actionPrompt: string;
  trigger?: (props: {
    onInjectSpike: (archetype: string) => void;
    onOpenMetricsReport: () => void;
    onOpenShowcase: () => void;
  }) => void;
}

const STORY_STEPS: StoryStep[] = [
  {
    id: 1,
    title: '1. Baseline Sinus Rhythm',
    durationSeconds: 15,
    badge: 'NORMAL STATE',
    description: 'Pulse maintains a rolling EWMA risk baseline (~2.0%). Routine transactions process with zero friction and green sinus indicators.',
    actionPrompt: 'Observing healthy steady-state volume...'
  },
  {
    id: 2,
    title: '2. Botnet Attack Injection',
    durationSeconds: 20,
    badge: 'ATTACK INFLUX',
    description: 'Injecting a synthetic 16-transaction Card Testing Bot Burst into the live stream to test rolling velocity detection.',
    actionPrompt: 'Triggering burst simulation...',
    trigger: ({ onInjectSpike }) => {
      onInjectSpike('card_testing_bot_burst');
    }
  },
  {
    id: 3,
    title: '3. Arrhythmia Red Alert (+2.5σ)',
    durationSeconds: 20,
    badge: 'DETECTION TRIGGERED',
    description: 'Rolling Z-score breaches the +2.5σ clinical threshold. The sweep line turns Arrhythmia Red with an under-damped bounce.',
    actionPrompt: 'Critical velocity alert raised in Flagged Cases Queue...'
  },
  {
    id: 4,
    title: '4. Case Diagnosis & Step-Up',
    durationSeconds: 20,
    badge: 'AI EXPLAINER',
    description: 'The risk engine isolates top SHAP features and produces a plain-language defense summary for 1-click step-up enforcement.',
    actionPrompt: 'Enforcing targeted cluster challenge...'
  },
  {
    id: 5,
    title: '5. Held-Out Validation Proof',
    durationSeconds: 15,
    badge: 'ECONOMIC METRICS',
    description: 'Validation on 5,000 unseen test records proves 95.0% Precision, 100.0% Recall, and transparent ₹420/1k false-positive accounting.',
    actionPrompt: 'Reviewing held-out benchmarks...',
    trigger: ({ onOpenMetricsReport }) => {
      onOpenMetricsReport();
    }
  }
];

export const StoryModeWalkthrough: React.FC<StoryModeWalkthroughProps> = ({
  isActive,
  onClose,
  onInjectSpike,
  onOpenMetricsReport,
  onOpenShowcase,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedInStep, setElapsedInStep] = useState(0);
  const timerRef = useRef<any>(null);

  const currentStep = STORY_STEPS[currentStepIdx];

  // Run step triggers on change
  useEffect(() => {
    if (isActive && currentStep.trigger) {
      currentStep.trigger({ onInjectSpike, onOpenMetricsReport, onOpenShowcase });
    }
  }, [currentStepIdx, isActive, currentStep, onInjectSpike, onOpenMetricsReport, onOpenShowcase]);

  useEffect(() => {
    if (!isActive || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedInStep(prev => {
        if (prev + 1 >= currentStep.durationSeconds) {
          if (currentStepIdx < STORY_STEPS.length - 1) {
            setCurrentStepIdx(c => c + 1);
            return 0;
          } else {
            return currentStep.durationSeconds;
          }
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, currentStepIdx, currentStep.durationSeconds]);

  if (!isActive) return null;

  const totalStoryTime = STORY_STEPS.reduce((sum, s) => sum + s.durationSeconds, 0);
  const overallElapsed = STORY_STEPS.slice(0, currentStepIdx).reduce((sum, s) => sum + s.durationSeconds, 0) + elapsedInStep;
  const overallPercent = Math.min(100, (overallElapsed / totalStoryTime) * 100);

  const handleNext = () => {
    if (currentStepIdx < STORY_STEPS.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
      setElapsedInStep(0);
    } else {
      onClose();
    }
  };

  return (
    <div className="bg-[#DBEAFE] border-b-3 border-[#18181B] text-[#18181B] px-6 py-3 shadow-[0_4px_0_#18181B] sticky top-[65px] z-30 transition-all font-mono">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        {/* Step Information */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2563EB] text-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-lg flex items-center justify-center font-black font-display text-base shrink-0">
            {currentStepIdx + 1}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="neo-badge neo-badge-blue text-[10px]">
                90-SEC JUDGE WALKTHROUGH
              </span>
              <span className="font-black text-sm text-[#18181B]">{currentStep.title}</span>
              <span className="neo-badge neo-badge-dark text-[10px]">
                {currentStep.durationSeconds - elapsedInStep}s remaining
              </span>
            </div>
            <p className="text-[11px] text-[#52525B] mt-0.5 max-w-2xl font-body font-medium">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Controls & Progress */}
        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
          <div className="w-24 sm:w-36 bg-white h-3 rounded-full overflow-hidden border-2 border-[#18181B] hidden sm:block">
            <div
              className="bg-[#2563EB] h-full transition-all duration-300"
              style={{ width: `${overallPercent}%` }}
            />
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-[#18181B] hover:bg-[#FAF6F0] cursor-pointer"
            title={isPaused ? 'Resume Story' : 'Pause Story'}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          </button>

          <button
            onClick={handleNext}
            className="neo-btn neo-btn-primary px-3 py-1.5 text-xs text-white"
          >
            <span>{currentStepIdx < STORY_STEPS.length - 1 ? 'Next Step' : 'Finish'}</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-[#18181B] hover:bg-[#EF4444] hover:text-white cursor-pointer"
            title="Exit Story Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
