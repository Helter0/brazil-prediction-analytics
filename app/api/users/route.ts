export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';

const CACHE_PATH = '/tmp/markets_cache.json';

export async function GET(req: NextRequest) {
  let markets: Array<{ conditionId: string }> = [];
  try {
    const data = await fs.readFile(CACHE_PATH, 'utf8');
    markets = JSON.parse(data);
  } catch {
    const origin = new URL(req.url).origin;
    const resp = await fetch(`${origin}/api/markets`);
    markets = await resp.json();
  }

  type Stats = {
    trades_count: number;
    markets_set: Set<string>;
    total_usdc: number;
    last_ts: number;
  };
  const users: Record<string, Stats> = {};
  for (const m of markets) {
    let offset = 0;
    const limit = 10000;
    while (true) {
      const api = `https://data-api.polymarket.com/trades?market=${m.conditionId}&limit=${limit}&offset=${offset}`;
      const res = await fetch(api);
      const json = await res.json();
      const trades = json.data ?? json.trades ?? json;
      if (!trades || trades.length === 0) break;

      for (const t of trades) {
        const wallet: string | undefined = t.proxyWallet ?? t.taker ?? t.maker;
        if (!wallet) continue;
        const size = parseFloat(t.size ?? '0');
        const price = parseFloat(t.price ?? '0');
        const amount = size * price;
        if (!users[wallet]) {
          users[wallet] = { trades_count: 0, markets_set: new Set(), total_usdc: 0, last_ts: 0 };
        }
        const u = users[wallet];
        u.trades_count += 1;
        u.markets_set.add(m.conditionId);
        u.total_usdc += amount;
        const ts = parseInt(t.timestamp ?? t.created_at ?? '0', 10);
        if (ts > u.last_ts) u.last_ts = ts;
      }
      offset += limit;
      if (trades.length < limit) break;
    }
  }

  const ninetyDaysAgo = Math.floor(Date.now() / 1000 - 90 * 24 * 3600);
  const filtered = Object.entries(users)
    .filter(([_, s]) => s.trades_count >= 2 && s.total_usdc >= 10 && s.last_ts >= ninetyDaysAgo)
    .map(([wallet, s]) => ({
      proxyWallet: wallet,
      trades_count: s.trades_count,
      markets_count: s.markets_set.size,
      total_usdc: s.total_usdc,
      avg_bet_size_usdc: s.total_usdc / s.trades_count,
      last_ts: s.last_ts,
    }));
  return NextResponse.json(filtered);
}
