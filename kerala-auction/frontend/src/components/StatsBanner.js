import React, { useEffect, useState } from 'react';
import './StatsBanner.css';

export default function StatsBanner() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const topBanks = stats?.byBank?.slice(0, 3) || [];
  const topTypes = stats?.byType || [];

  return (
    <div className="stats-banner">
      <div className="stat-block main-stat">
        <div className="stat-number">{stats?.total ?? '—'}</div>
        <div className="stat-label">Total vehicles listed</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-block">
        <div className="stat-number highlight">{stats?.upcoming ?? '—'}</div>
        <div className="stat-label">Active auctions</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-block type-breakdown">
        <div className="stat-label">By type</div>
        <div className="type-pills">
          {topTypes.map(t => (
            <span key={t.vehicle_type} className="type-pill">
              {t.vehicle_type}: <strong>{t.c}</strong>
            </span>
          ))}
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-block">
        <div className="stat-label">Top banks</div>
        <div className="bank-list">
          {topBanks.map(b => (
            <div key={b.bank_name} className="bank-row">
              <span className="bank-label">{b.bank_name}</span>
              <span className="bank-count">{b.c}</span>
            </div>
          ))}
          {topBanks.length === 0 && <span className="stat-placeholder">Loading…</span>}
        </div>
      </div>
      {stats?.lastScrapeAt && (
        <div className="last-updated">
          Updated: {new Date(stats.lastScrapeAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}
