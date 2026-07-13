"use client";

export function IndicatorPanel({ title, values, type }: { title: string; values: number[]; type: "rsi" | "macd" }) {
  const width = 800, height = 112, padding = 10;
  const finite = values.filter(Number.isFinite);
  const min = type === "rsi" ? 0 : Math.min(...finite, 0), max = type === "rsi" ? 100 : Math.max(...finite, 0);
  const points = values.map((v, i) => `${padding + i / Math.max(1, values.length - 1) * (width - padding * 2)},${height - padding - (v - min) / Math.max(.0001, max - min) * (height - padding * 2)}`).join(" ");
  const y = (v: number) => height - padding - (v - min) / Math.max(.0001, max - min) * (height - padding * 2);
  const latest = finite.at(-1) ?? 0;
  return (
    <div className="indicator-panel">
      <div className="flex items-center justify-between px-4 pt-3"><span className="eyebrow">{title}</span><span className={latest >= (type === "rsi" ? 50 : 0) ? "text-emerald-300" : "text-rose-300"}>{latest.toFixed(type === "rsi" ? 1 : 2)}</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[112px] w-full" preserveAspectRatio="none">
        {type === "rsi" && <><rect x="0" y={y(70)} width={width} height={y(30)-y(70)} fill="rgba(99,179,255,.035)"/><line x1="0" y1={y(70)} x2={width} y2={y(70)} stroke="#29364c" strokeDasharray="4 5"/><line x1="0" y1={y(30)} x2={width} y2={y(30)} stroke="#29364c" strokeDasharray="4 5"/></>}
        {type === "macd" && values.map((v,i) => <rect key={i} x={i/values.length*width} y={Math.min(y(0),y(v))} width={Math.max(1,width/values.length*.7)} height={Math.abs(y(v)-y(0))} fill={v>=0?"rgba(34,211,166,.4)":"rgba(243,95,115,.4)"}/>)}
        <polyline fill="none" stroke={type === "rsi" ? "#63b3ff" : "#b996ff"} strokeWidth="1.7" points={points}/>
      </svg>
    </div>
  );
}
