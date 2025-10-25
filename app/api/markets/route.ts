export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';

const CSV_URL = 'https://raw.githubusercontent.com/Helter0/Polymarket_Brazil/main/Brazil_markets.csv';
const CACHE_PATH = '/tmp/markets_cache.json';

export async function GET(_: NextRequest) {
  // Check cache
  try {
    const cached = await fs.readFile(CACHE_PATH, 'utf8');
    return NextResponse.json(JSON.parse(cached));
  } catch {
    // no cache
  }
  const csvResp = await fetch(CSV_URL, { cache: 'no-store' });
  const csvText = await csvResp.text();
  const titles = csvText.trim().split('\n').slice(1);

  const markets: any[] = [];
  for (const rawTitle of titles) {
    const title = rawTitle.trim();
    if (!title) continue;
    const encoded = encodeURIComponent(title);
    const searchUrl = `https://gamma-api.polymarket.com/public-search?q=${encoded}&limit_per_type=10&keep_closed_markets=1&optimized=true`;
    const res = await fetch(searchUrl);
    const json = await res.json();
    if (json && Array.isArray(json.markets)) {
      for (const m of json.markets) {
        markets.push({
          conditionId: m.conditionId ?? m.condition_id,
          slug: m.slug,
          category: m.category,
          question: m.question ?? m.title,
        });
      }
    }
  }

  await fs.writeFile(CACHE_PATH, JSON.stringify(markets), 'utf8');
  return NextResponse.json(markets);
}
