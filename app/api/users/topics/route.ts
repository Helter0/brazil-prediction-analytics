export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const usersResp = await fetch(`${origin}/api/users`);
  const users = await usersResp.json();

  const categories: Record<string, { trades: number; total_usdc: number }> = {};
  let allTrades = 0;

  for (const u of users) {
    let offset = 0;
    const limit = 10000;
    while (true) {
      const api = `https://data-api.polymarket.com/trades?user=${u.proxyWallet}&limit=${limit}&offset=${offset}`;
      const res = await fetch(api);
      const json = await res.json();
      const trades = json.data ?? json.trades ?? json;
      if (!trades || trades.length === 0) break;

      for (const t of trades) {
        const category = t.category ?? t.market?.category ?? 'unknown';
        const size = parseFloat(t.size ?? '0');
        const price = parseFloat(t.price ?? '0');
        const amount = size * price;
        if (!categories[category]) {
          categories[category] = { trades: 0, total_usdc: 0 };
        }
        categories[category].trades += 1;
        categories[category].total_usdc += amount;
        allTrades += 1;
      }
      offset += limit;
      if (trades.length < limit) break;
    }
  }

  const result = Object.entries(categories).map(([cat, s]) => ({
    category: cat,
    trades_count: s.trades,
    share_of_trades: allTrades > 0 ? s.trades / allTrades : 0,
    avg_bet_size_usdc: s.trades > 0 ? s.total_usdc / s.trades : 0,
  }));
  return NextResponse.json(result);
}
