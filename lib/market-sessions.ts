import { IntradaySession } from "./types";

export interface TradingPeriod {
  start?: number;
  end?: number;
}

export interface TradingPeriods {
  pre?: TradingPeriod;
  regular?: TradingPeriod;
  post?: TradingPeriod;
}

interface ZonedClock {
  hour: number;
  minute: number;
}

export function isWithinTradingPeriod(timestamp: number, period?: TradingPeriod) {
  return period?.start != null && period.end != null && timestamp >= period.start && timestamp < period.end;
}

function zonedClock(timestamp: number, timezone: string): ZonedClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp * 1000));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value ?? 0);
  return { hour: value("hour"), minute: value("minute") };
}

export function classifyIntradaySession(
  timestamp: number,
  timezone: string,
  periods?: TradingPeriods,
): IntradaySession | null {
  if (isWithinTradingPeriod(timestamp, periods?.pre)) return "pre";
  if (isWithinTradingPeriod(timestamp, periods?.regular)) return "regular";
  if (isWithinTradingPeriod(timestamp, periods?.post)) return "post";

  const { hour, minute } = zonedClock(timestamp, timezone);
  const clockMinutes = hour * 60 + minute;
  if (clockMinutes >= 4 * 60 && clockMinutes < 9 * 60 + 30) return "pre";
  if (clockMinutes >= 9 * 60 + 30 && clockMinutes < 16 * 60) return "regular";
  if (clockMinutes >= 16 * 60 && clockMinutes < 20 * 60) return "post";
  return null;
}
