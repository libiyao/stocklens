"use client";

import { BookmarkPlus, X } from "lucide-react";

interface WatchlistBarProps {
  watchlist: string[];
  currentTicker: string;
  onSelect: (ticker: string) => void;
  onAdd: () => void;
  onRemove: (ticker: string) => void;
}

export function WatchlistBar({ watchlist, currentTicker, onSelect, onAdd, onRemove }: WatchlistBarProps) {
  const containsCurrent = watchlist.includes(currentTicker);
  return (
    <nav className="watchlist-bar" aria-label="Saved tickers">
      <span className="watchlist-label">Watchlist</span>
      <div className="watchlist-items">
        {watchlist.map(ticker => (
          <span className={`watchlist-chip ${ticker === currentTicker ? "active" : ""}`} key={ticker}>
            <button onClick={() => onSelect(ticker)}>{ticker}</button>
            <button aria-label={`Remove ${ticker} from watchlist`} className="watchlist-remove" onClick={() => onRemove(ticker)}><X size={10} /></button>
          </span>
        ))}
      </div>
      {!containsCurrent && <button className="watchlist-add" onClick={onAdd}><BookmarkPlus size={12} /> Save {currentTicker}</button>}
    </nav>
  );
}
