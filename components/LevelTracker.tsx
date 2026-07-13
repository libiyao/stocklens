"use client";

import { Bell, BellRing } from "lucide-react";
import { useLevelAlerts } from "@/hooks/useLevelAlerts";

interface TrackedLevel {
  label: string;
  price: number;
  direction: "above" | "below";
}

interface LevelTrackerProps {
  ticker: string;
  currentPrice: number;
  levels: TrackedLevel[];
}

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export function LevelTracker({ ticker, currentPrice, levels }: LevelTrackerProps) {
  const { toggleAlert, isTracked } = useLevelAlerts();
  return (
    <section className="panel utility-card">
      <div className="panel-title"><span><Bell size={14} /> Key-level tracker</span><small>DEVICE LOCAL</small></div>
      <div className="tracker-list">
        {levels.map(level => {
          const tracked = isTracked(ticker, level.label);
          const distance = (level.price / currentPrice - 1) * 100;
          const triggered = level.direction === "above" ? currentPrice >= level.price : currentPrice <= level.price;
          return (
            <button key={level.label} className={tracked ? "tracked" : ""} onClick={() => toggleAlert({ ticker, label: level.label, price: level.price, direction: level.direction })}>
              <span>{tracked ? <BellRing size={13} /> : <Bell size={13} />}<i>{level.label}</i></span>
              <span><b>{fmt.format(level.price)}</b><em className={triggered ? "triggered" : ""}>{triggered ? "Reached" : `${distance >= 0 ? "+" : ""}${distance.toFixed(1)}%`}</em></span>
            </button>
          );
        })}
      </div>
      <p className="tracker-note">Tracking is stored in this browser. It does not send email or push notifications.</p>
    </section>
  );
}
