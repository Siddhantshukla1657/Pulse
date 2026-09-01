export interface FeatureContribution {
  feature: string;
  description: string;
  value: number;
  weight: number;
  detail: string;
}

export interface Transaction {
  txn_id: string;
  timestamp: string;
  stream_index: number;
  user_id?: string;
  amount: number;
  payment_method: string;
  category?: string;
  city?: string;
  score: number;
  is_high_risk: boolean;
  top_features: FeatureContribution[];
}

export interface VitalsPoint {
  stream_index: number;
  txn_id: string;
  score: number;
  current_risk_rate: number;
  baseline_ewma: number;
  std_dev: number;
  z_score: number;
  in_spike: boolean;
  is_calibrated: boolean;
}

export interface SpikeFlag {
  id: string;
  type: 'spike' | 'transaction';
  status: 'active' | 'resolved' | 'open';
  deviation_sigma: number;
  cusum_statistic?: number;
  current_risk_rate?: number;
  baseline_rate?: number;
  std_deviation?: number;
  first_anomalous_txn_id: string;
  detected_at: string;
  window_size?: number;
  score?: number;
  resolved: boolean;
  resolved_action?: string | null;
  resolved_at?: string | null;
  features?: FeatureContribution[];
  txn?: Transaction;
}

export interface ExplanationResponse {
  flag_id: string;
  flag_type: string;
  explanation: {
    summary: string;
    key_drivers: string[];
    recommendation: string;
    engine: string;
  };
}

export interface ClassificationMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  threshold: number;
  confusion_matrix: {
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
  };
}

export interface EconomicImpact {
  assumed_fp_cost_inr: number;
  total_fp_cost_inr: number;
  fp_cost_per_1000_txns_inr: number;
  fraud_prevented_inr: number;
  fraud_missed_inr: number;
}

export interface SpikeBenchmark {
  total_ground_truth_spikes: number;
  caught_spikes: number;
  missed_spikes: number;
  total_spike_flags_raised: number;
  spike_recall: number;
  spike_precision: number;
  mean_time_to_detection_txns: number;
  median_time_to_detection_txns: number;
  target_sla_txns: number;
}

export interface ShowcaseCase {
  id: string;
  type: string;
  label: string;
  txn: any;
  score: number;
  is_fraud_actual: boolean;
  predicted_fraud: boolean;
  top_features: FeatureContribution[];
  explanation_summary: string;
}

export interface MetricsReport {
  classification?: {
    dataset_split: {
      total_transactions: number;
      train_transactions: number;
      heldout_transactions: number;
      heldout_fraud_count: number;
    };
    classification_metrics: ClassificationMetrics;
    economic_impact: EconomicImpact;
    feature_importances: Array<{ feature: string; importance: number; description: string }>;
    showcase_cases: {
      true_positive: ShowcaseCase;
      false_positive: ShowcaseCase;
    };
  };
  spike_benchmarks?: {
    spike_metrics: SpikeBenchmark;
    detailed_spike_results: Array<any>;
  };
}

export interface AuditEntry {
  flag_id: string;
  action: string;
  analyst: string;
  notes: string;
  timestamp: string;
}

export interface DetectorConfig {
  is_running: boolean;
  is_paused: boolean;
  speed_multiplier: number;
  window_size: number;
  z_threshold: number;
  ewma_alpha: number;
  risk_cutoff: number;
}

export interface AttackScenario {
  id: string;
  name: string;
  archetype: string;
  description: string;
  burst_size: number;
  expected_deviation: string;
}
