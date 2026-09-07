import React from 'react';
import './VehicleCard.css';

const TYPE_ICONS = { '2W': '🛵', '3W': '🛺', '4W': '🚗', 'Commercial': '🚚', 'Agricultural': '🚜' };
const COND_CLASS = { Running: 'cond-good', Average: 'cond-avg', Poor: 'cond-poor', Scrap: 'cond-scrap', Unknown: 'cond-unknown' };

function formatPrice(p) {
  if (!p || p === 0) return 'Contact bank';
  if (p >= 100000) return `₹${(p / 100000).toFixed(1)}L`;
  if (p >= 1000)   return `₹${(p / 1000).toFixed(0)}K`;
  return `₹${p.toLocaleString('en-IN')}`;
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return null;
  if (days === 0) return 'Ends today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function VehicleCard({ vehicle, onClick }) {
  const icon   = TYPE_ICONS[vehicle.vehicle_type] || '🚘';
  const days   = daysLeft(vehicle.auction_end);
  const urgent = days && days.includes('today');

  return (
    <article className="vehicle-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>

      <div className="card-header">
        <span className="vehicle-icon" aria-hidden="true">{icon}</span>
        <div className="card-title-group">
          <h3 className="vehicle-name">
            {vehicle.make || 'Unknown'} {vehicle.model || ''}
            {vehicle.year && <span className="vehicle-year">{vehicle.year}</span>}
          </h3>
          <div className="vehicle-reg">{vehicle.registration_no || 'Reg. not listed'}</div>
        </div>
        {vehicle.condition && (
          <span className={`condition-badge ${COND_CLASS[vehicle.condition] || 'cond-unknown'}`}>
            {vehicle.condition}
          </span>
        )}
      </div>

      <div className="card-body">
        <div className="card-meta-row">
          <span className="meta-item">
            <span className="meta-icon">🏦</span>
            {vehicle.bank_name}
          </span>
          <span className="meta-item">
            <span className="meta-icon">📍</span>
            {vehicle.location_district
              ? vehicle.location_district.charAt(0).toUpperCase() + vehicle.location_district.slice(1)
              : 'Kerala'}
          </span>
        </div>

        <div className="price-auction-row">
          <div className="price-block">
            <div className="price-label">Reserve Price</div>
            <div className="price-value">{formatPrice(vehicle.reserve_price)}</div>
            {vehicle.emd_amount > 0 && (
              <div className="emd-label">EMD: {formatPrice(vehicle.emd_amount)}</div>
            )}
          </div>
          <div className="auction-block">
            <div className="price-label">Auction Date</div>
            <div className={`auction-date ${urgent ? 'urgent' : ''}`}>
              {formatDate(vehicle.auction_end)}
            </div>
            {days && <div className={`days-left ${urgent ? 'urgent' : ''}`}>{days}</div>}
          </div>
        </div>
      </div>

      <div className="card-footer">
        <span className="source-tag">{sourceLabel(vehicle.source)}</span>
        <span className="view-detail">View details →</span>
      </div>
    </article>
  );
}

function sourceLabel(source) {
  const map = {
    mstc_ibapi: 'MSTC IBAPI',
    esaf_bank:  'ESAF Bank PDF',
    sib:        'South Indian Bank',
    kgb:        'Kerala Gramin Bank',
    federal_bank: 'Federal Bank'
  };
  return map[source] || source;
}
