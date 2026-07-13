import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockLens — Technical Intelligence",
  description: "Institutional-style technical analysis from real market data",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
