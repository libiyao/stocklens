import { AlertTriangle, CheckCircle2, Clock3, GitBranch, MinusCircle, Target, XCircle } from "lucide-react";
import { MarketScenario, ScenarioAnalysis } from "@/lib/scenarios";

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function conditionText(condition: MarketScenario["trigger"]) {
  if (condition.range) return `${fmt.format(condition.range.low)}–${fmt.format(condition.range.high)}`;
  if (condition.price != null) return fmt.format(condition.price);
  return "Conditional";
}

export function ScenarioReasoningPanel({ analysis }: { analysis: ScenarioAnalysis }) {
  const leading = analysis.scenarios.find(scenario => scenario.id === analysis.leadingScenario)!;
  return (
    <section className="panel scenario-reasoning-card">
      <div className="panel-title">
        <span><GitBranch size={14} /> Conditional scenario map</span>
        <small>SETUP WEIGHTS · NOT FORECAST ODDS</small>
      </div>
      <div className="scenario-summary-strip">
        <div><span>Leading setup</span><b className={leading.id}>{leading.label} · {leading.setupWeight}%</b></div>
        <div><span>Model confidence</span><b>{analysis.confidence}</b></div>
        <div><span>Market regime</span><b>{analysis.regime}</b></div>
        <div><span>Decision zone</span><b>{fmt.format(analysis.decisionZone.low)}–{fmt.format(analysis.decisionZone.high)} · {analysis.decisionZone.days}d</b></div>
      </div>
      <div className="scenario-card-grid">
        {analysis.scenarios.map(scenario => (
          <article className={`scenario-case ${scenario.id} ${scenario.id === analysis.leadingScenario ? "leading" : ""}`} key={scenario.id}>
            <div className="scenario-case-heading">
              <div><span className="scenario-dot" style={{ background: scenario.color }} /><h3>{scenario.label}</h3>{scenario.id === analysis.leadingScenario && <em>Leading</em>}</div>
              <strong>{scenario.setupWeight}<small>%</small></strong>
            </div>
            <div className="scenario-weight-track"><i style={{ width: `${scenario.setupWeight}%`, background: scenario.color }} /></div>
            <p>{scenario.summary}</p>
            <div className="scenario-definition-grid">
              <div><GitBranch size={12} /><span>Activation</span><b>{conditionText(scenario.trigger)}</b><small>{scenario.trigger.label}</small></div>
              <div><Target size={12} /><span>Target range</span><b>{fmt.format(scenario.target.low)}–{fmt.format(scenario.target.high)}</b><small>Volatility-adjusted zone</small></div>
              <div><XCircle size={12} /><span>Invalidation</span><b>{conditionText(scenario.invalidation)}</b><small>{scenario.invalidation.label}</small></div>
              <div><Clock3 size={12} /><span>Horizon</span><b>{scenario.horizonDays} sessions</b><small>Illustrative path window</small></div>
            </div>
            <div className="scenario-evidence">
              <h4>Why this weight</h4>
              {scenario.evidence.map(item => {
                const Icon = item.impact === "supporting" ? CheckCircle2 : item.impact === "opposing" ? XCircle : MinusCircle;
                return (
                  <div className={item.impact} key={item.factor}>
                    <Icon size={12} />
                    <span><b>{item.factor}</b><small>{item.detail}</small></span>
                    <em>{item.contribution > 0 ? "+" : ""}{item.contribution}</em>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <div className="scenario-methodology"><AlertTriangle size={13} /><span>{analysis.methodology} Paths activate only if their stated conditions occur.</span></div>
    </section>
  );
}
