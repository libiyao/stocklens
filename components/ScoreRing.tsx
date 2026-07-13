export function ScoreRing({ score }: { score: number }) {
  const radius = 43, circumference = 2 * Math.PI * radius;
  const color = score >= 65 ? "#22d3a6" : score <= 40 ? "#f35f73" : "#f3c969";
  return <div className="relative h-28 w-28"><svg viewBox="0 0 110 110" className="-rotate-90"><circle cx="55" cy="55" r={radius} fill="none" stroke="#1e293b" strokeWidth="8"/><circle cx="55" cy="55" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference*(1-score/100)}/></svg><div className="absolute inset-0 grid place-content-center text-center"><b className="text-3xl text-white">{score}</b><span className="text-[9px] tracking-widest text-slate-500">/ 100</span></div></div>;
}
