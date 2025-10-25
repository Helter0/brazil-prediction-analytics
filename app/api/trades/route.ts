import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const conditionId = url.searchParams.get('conditionId');
  if (!conditionId) {
    return NextResponse.json({ error: 'conditionId required' }, { status: 400 });
  }

  let offset = 0;
  const limit = 10000;
  let totalTrades = 0;
  let totalVolume = 0;
  const traders = new Set<string>();

  while (true) {
    const api = `https://data-api.polymarket.com/trades?market=${conditionId}&limit=${limit}&offset=${offset}`;
    const resp = await fetch(api);
    const json = await resp.json();
    const trades = json.data ?? json.trades ?? json;
    if (!trades || trades.length === 0) break;

    for (const t of trades) {
      const size = parseFloat(t.size ?? '0');
      const price = parseFloat(t.price ?? '0');
      totalVolume += size * price;
      totalTrades += 1;
      const wallet = t.proxyWallet ?? t.taker ?? t.maker;
      if (wallet) traders.add(wallet);
    }
    offset += limit;
    if (trades.length < limit) break;
  }

  const avgBet = totalTrades > 0 ? totalVolume / totalTrades : 0;
  return NextResponse.json({
    total_trades: totalTrades,
    unique_traders: traders.size,
    total_volume_usdc: totalVolume,
    avg_bet_size_usdc: avgBet,
  });
}
