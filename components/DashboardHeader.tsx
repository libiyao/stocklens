"use client";

import { FormEvent, useState } from "react";
import { Crosshair, LoaderCircle, Search } from "lucide-react";
import { TIME_RANGES } from "@/lib/constants";
import { TickerSearchResult } from "@/lib/providers/types";
import { TimeRange } from "@/lib/types";

interface DashboardHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent) => void;
  onSelectTicker: (ticker: string) => void;
  suggestions: TickerSearchResult[];
  searching: boolean;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

export function DashboardHeader({ query, onQueryChange, onSubmit, onSelectTicker, suggestions, searching, range, onRangeChange }: DashboardHeaderProps) {
  const [focused, setFocused] = useState(false);

  return (
    <header className="border-b border-slate-800/80 bg-[#080d17]/90 px-5 py-4 backdrop-blur-xl lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="brand-mark"><Crosshair size={19} /></div>
          <div><h1 className="text-lg font-semibold tracking-tight text-white">Stock<span className="text-sky-400">Lens</span></h1><p className="text-[9px] uppercase tracking-[.24em] text-slate-500">Technical intelligence</p></div>
        </div>
        <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2 md:max-w-2xl">
          <div className="search-wrap">
            <label className="search-box">
              {searching ? <LoaderCircle className="animate-spin" size={15} /> : <Search size={15} />}
              <input
                aria-label="Ticker symbol"
                autoComplete="off"
                value={query}
                onChange={event => onQueryChange(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 120)}
                placeholder="Search ticker or company"
              />
              <kbd>↵</kbd>
            </label>
            {focused && suggestions.length > 0 && (
              <div className="suggestion-menu" role="listbox" aria-label="Ticker suggestions">
                {suggestions.map(suggestion => (
                  <button key={`${suggestion.symbol}-${suggestion.exchange}`} type="button" onMouseDown={() => onSelectTicker(suggestion.symbol)}>
                    <span><b>{suggestion.symbol}</b><small>{suggestion.name}</small></span>
                    <em>{suggestion.exchange || suggestion.quoteType || "Market"}</em>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="range-group" aria-label="Chart range">
            {TIME_RANGES.map(item => <button type="button" key={item} onClick={() => onRangeChange(item)} className={range === item ? "active" : ""}>{item}</button>)}
          </div>
        </form>
        <div className="hidden items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-300 md:flex"><span className="status-dot" /> Live market data</div>
      </div>
    </header>
  );
}
