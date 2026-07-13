import Dashboard from "@/components/Dashboard";
import { DEFAULT_RANGE, TIME_RANGES } from "@/lib/constants";
import { TimeRange } from "@/lib/types";

interface StockPageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ range?: string }>;
}

export default async function StockPage({ params, searchParams }: StockPageProps) {
  const [{ ticker }, query] = await Promise.all([params, searchParams]);
  const range = TIME_RANGES.includes(query.range as TimeRange) ? query.range as TimeRange : DEFAULT_RANGE;
  return <Dashboard initialTicker={ticker.toUpperCase()} initialRange={range} />;
}
