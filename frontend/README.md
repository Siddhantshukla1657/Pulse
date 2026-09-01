<div align="center">

<img src="public/logo.png" alt="Pulse Logo" width="120" />

# Pulse Frontend: Vitals Dashboard

</div>

Built with React 18, Vite, TypeScript, and Tailwind CSS. Neo-brutalist clinical telemetry interface for real-time transaction risk scoring and rolling spike detection.

## Key Features & Modals

1. **Pulse Monitor Chart (`PulseChart.tsx`)**: Real-time SVG rolling risk rate line with EWMA baseline band, +2.5σ threshold triggers, and Arrhythmia Red alert glow.
2. **Flagged Cases Sentinel (`FlaggedCaseList.tsx`)**: Inline queue with SHAP feature attributions and plain-language defensive explanations.
3. **4 Diagnostic & Telemetry Suites**:
   - **`Pitch Showcase`** (`ShowcaseModal.tsx`): Caught-Fraud (TP) vs False-Positive (FP) comparison.
   - **`Live Telemetry`** (`LiveMetricsView.tsx`): Active session stream rate, velocity metrics, and in-memory 3-tier risk score distribution histogram.
   - **`Action Report`** (`AuditTrailView.tsx`): Live analyst challenge ledger, step-up enforcement rate %, and justification logs.
   - **`ML Benchmarks Report`** (`MetricsReportView.tsx`): 5,000 held-out test split evaluation with confusion matrix, ROC-AUC, and global SHAP feature importances.
4. **Attack Scenario Deck (`ScenarioModal.tsx`)**: Synthetic card testing, credential stuffing, and crypto storm injector.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
