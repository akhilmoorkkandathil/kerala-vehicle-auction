import React, { useState, useEffect, useCallback } from 'react';
import StatsBanner from '../components/StatsBanner';
import FilterPanel from '../components/FilterPanel';
import VehicleCard from '../components/VehicleCard';
import './HomePage.css';

const DEFAULT_FILTERS = {
  district: '', bank: '', type: '', condition: '',
  minPrice: '', maxPrice: '', search: '',
  sortBy: 'auction_end', page: 1, limit: 18
};

export default function HomePage({ onSelect }) {
  const [filters, setFilters]     = useState(DEFAULT_FILTERS);
  const [vehicles, setVehicles]   = useState([]);
  const [meta, setMeta]           = useState({ total: 0, totalPages: 1, page: 1 });
  const [banks, setBanks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');

  // Fetch filter options
  useEffect(() => {
    fetch('/api/vehicles/meta/filters')
      .then(r => r.json())
      .then(data => setBanks(data.banks || []))
      .catch(() => {});
  }, []);

  // Fetch vehicles
  const fetchVehicles = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v !== '' && v != null) params.set(k, v); });
      const res = await fetch(`/api/vehicles?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setVehicles(data.data);
      setMeta(data.meta);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVehicles(filters); }, [filters, fetchVehicles]);

  // Search with debounce
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, search, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [search]);

  const clearFilters = () => { setSearch(''); setFilters(DEFAULT_FILTERS); };

  const activeFilterCount = [
    filters.district, filters.bank, filters.type, filters.condition,
    filters.minPrice, filters.maxPrice, search
  ].filter(Boolean).length;

  return (
    <div className="home-page">
      <StatsBanner />

      <div className="listings-layout" id="listings">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          banks={banks}
          onClear={clearFilters}
        />

        <div className="listings-main">
          <div className="listings-toolbar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                type="text"
                placeholder="Search make, model, registration, bank…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            <div className="results-info">
              {loading ? 'Loading…' : `${meta.total} vehicle${meta.total !== 1 ? 's' : ''} found`}
              {activeFilterCount > 0 && (
                <button className="filter-clear-inline" onClick={clearFilters}>
                  Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="error-state">
              <span>⚠️</span> {error}
              <button onClick={() => fetchVehicles(filters)}>Retry</button>
            </div>
          )}

          {!loading && !error && vehicles.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🚗</div>
              <h3>No vehicles found</h3>
              <p>Try adjusting your filters or check back later for new listings.</p>
              <button className="btn-primary" onClick={clearFilters}>Clear filters</button>
            </div>
          )}

          {loading && (
            <div className="grid-skeleton">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-card" aria-hidden="true" />
              ))}
            </div>
          )}

          {!loading && vehicles.length > 0 && (
            <>
              <div className="vehicle-grid">
                {vehicles.map(v => (
                  <VehicleCard key={v.id} vehicle={v} onClick={() => onSelect(v.id)} />
                ))}
              </div>

              {meta.totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={meta.page <= 1}
                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>
                    ← Previous
                  </button>
                  <span className="page-info">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <button
                    className="page-btn"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
