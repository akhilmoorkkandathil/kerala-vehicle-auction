import React from 'react';
import './FilterPanel.css';

const KERALA_DISTRICTS = [
  'thiruvananthapuram','kollam','pathanamthitta','alappuzha','kottayam',
  'idukki','ernakulam','thrissur','palakkad','malappuram','kozhikode',
  'wayanad','kannur','kasaragod'
];

const VEHICLE_TYPES = ['2W','3W','4W','Commercial','Agricultural'];
const CONDITIONS    = ['Running','Average','Poor','Scrap'];

export default function FilterPanel({ filters, onChange, banks = [], onClear }) {
  const set = (key, val) => onChange({ ...filters, [key]: val, page: 1 });

  return (
    <aside className="filter-panel">
      <div className="filter-header">
        <span className="filter-title">Filter</span>
        <button className="clear-btn" onClick={onClear}>Clear all</button>
      </div>

      <FilterGroup label="District">
        <select value={filters.district || ''} onChange={e => set('district', e.target.value)}>
          <option value="">All districts</option>
          {KERALA_DISTRICTS.map(d => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label="Vehicle type">
        <div className="chip-group">
          {VEHICLE_TYPES.map(t => (
            <button key={t}
              className={`chip ${filters.type === t ? 'active' : ''}`}
              onClick={() => set('type', filters.type === t ? '' : t)}>
              {t}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Condition">
        <div className="chip-group">
          {CONDITIONS.map(c => (
            <button key={c}
              className={`chip ${filters.condition === c ? 'active' : ''}`}
              onClick={() => set('condition', filters.condition === c ? '' : c)}>
              {c}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Bank">
        <select value={filters.bank || ''} onChange={e => set('bank', e.target.value)}>
          <option value="">All banks</option>
          {banks.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </FilterGroup>

      <FilterGroup label="Reserve price">
        <div className="price-inputs">
          <input type="number" placeholder="Min (₹)" min="0"
            value={filters.minPrice || ''}
            onChange={e => set('minPrice', e.target.value)} />
          <span className="price-sep">—</span>
          <input type="number" placeholder="Max (₹)" min="0"
            value={filters.maxPrice || ''}
            onChange={e => set('maxPrice', e.target.value)} />
        </div>
      </FilterGroup>

      <FilterGroup label="Sort by">
        <select value={filters.sortBy || 'auction_end'} onChange={e => set('sortBy', e.target.value)}>
          <option value="auction_end">Auction date</option>
          <option value="reserve_price">Price: Low to high</option>
          <option value="created_at">Recently added</option>
        </select>
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className="filter-group">
      <div className="filter-group-label">{label}</div>
      {children}
    </div>
  );
}
