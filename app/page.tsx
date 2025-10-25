"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import './chartConfig';

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const Pie = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });

export default function Home() {
  const [tab, setTab] = useState<'markets'|'users'|'topics'>('markets');
  const [marketsMetrics, setMarketsMetrics] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [minAvg, setMinAvg] = useState<number>(0);
  const [topics, setTopics] = useState<any[]>([]);

  useEffect(() => {
    async function loadMarkets() {
      const resMarkets = await fetch('/api/markets');
      const markets = await resMarkets.json();
      const metrics: any[] = [];
      for (const m of markets) {
        const statRes = await fetch(`/api/trades?conditionId=${m.conditionId}`);
        const stat = await statRes.json();
        metrics.push({
          name: m.question ?? m.slug,
          total_volume_usdc: stat.total_volume_usdc,
          unique_traders: stat.unique_traders,
          avg_bet_size_usdc: stat.avg_bet_size_usdc,
        });
      }
      setMarketsMetrics(metrics);
    }
    async function loadUsers() {
      const res = await fetch('/api/users');
      const js = await res.json();
      setUsers(js);
    }
    async function loadTopics() {
      const res = await fetch('/api/users/topics');
      const js = await res.json();
      setTopics(js);
    }
    loadMarkets();
    loadUsers();
    loadTopics();
  }, []);

  const filteredUsers = users.filter((u: any) => u.avg_bet_size_usdc >= minAvg);

  const barData = {
    labels: marketsMetrics.map(m => m.name),
    datasets: [
      { label: 'Общий объём (USDC)', data: marketsMetrics.map(m => m.total_volume_usdc) },
      { label: 'Уникальные трейдеры', data: marketsMetrics.map(m => m.unique_traders) },
      { label: 'Средний чек (USDC)', data: marketsMetrics.map(m => m.avg_bet_size_usdc) },
    ],
  };

  const pieData = {
    labels: topics.map((t:any) => t.category),
    datasets: [{
      label: 'Доля сделок',
      data: topics.map((t:any) => t.share_of_trades),
    }],
  };

  return (
    <main style={{ padding: '1rem' }}>
      <h1>Brazil Prediction Markets Analytics</h1>
      <nav style={{ marginBottom: '1rem' }}>
        <button onClick={() => setTab('markets')}>Markets</button>
        <button onClick={() => setTab('users')}>Users</button>
        <button onClick={() => setTab('topics')}>Other Topics</button>
      </nav>

      {tab === 'markets' && (
        <section>
          {marketsMetrics.length > 0 ? <Bar data={barData} /> : <p>Загрузка…</p>}
        </section>
      )}

      {tab === 'users' && (
        <section>
          <label>
            Минимальный средний чек (USDC):
            <input
              type="number"
              value={minAvg}
              onChange={e => setMinAvg(parseFloat(e.target.value) || 0)}
              style={{ marginLeft: '0.5rem' }}
            />
          </label>
          <table border={1} cellPadding={4} style={{ marginTop: '1rem', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Кошелёк</th>
                <th>Ставок</th>
                <th>Рынков</th>
                <th>Общий объём (USDC)</th>
                <th>Средний чек (USDC)</th>
                <th>Последняя сделка</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u:any) => (
                <tr key={u.proxyWallet}>
                  <td>{u.proxyWallet}</td>
                  <td>{u.trades_count}</td>
                  <td>{u.markets_count}</td>
                  <td>{u.total_usdc.toFixed(2)}</td>
                  <td>{u.avg_bet_size_usdc.toFixed(2)}</td>
                  <td>{new Date(u.last_ts * 1000).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'topics' && (
        <section>
          {topics.length > 0 ? <Pie data={pieData} /> : <p>Загрузка…</p>}
        </section>
      )}
    </main>
  );
}
