import React, { useEffect, useState } from 'react';
import './DetailPage.css';

function formatPrice(p) {
  if (!p || p === 0) return 'Contact bank';
  return `₹${Number(p).toLocaleString('en-IN')}`;
}

function formatDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const FIELD_LABELS = {
  make: 'Make', model: 'Model', year: 'Year of manufacture',
  registration_no: 'Registration number', vehicle_type: 'Vehicle type',
  condition: 'Condition', rc_status: 'RC available',
  bank_name: 'Bank / NBFC', source: 'Data source',
  location_district: 'District', location_address: 'Location',
  reserve_price: 'Reserve price', emd_amount: 'EMD required',
  bid_increment: 'Bid increment',
  auction_start: 'Auction opens', auction_end: 'Auction closes',
  contact_person: 'Contact person', contact_phone: 'Contact number',
};

export default function DetailPage({ id, onBack }) {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/vehicles/${id}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => { setVehicle(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) return <div className="detail-loading">Loading vehicle details…</div>;
  if (error)   return <div className="detail-error">⚠️ {error} <button onClick={onBack}>Go back</button></div>;
  if (!vehicle) return null;

  const title = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={onBack}>← Back to listings</button>

      <div className="detail-header">
        <div className="detail-title-group">
          <h1 className="detail-title">{title}</h1>
          {vehicle.year && <span className="detail-year">{vehicle.year}</span>}
          <div className="detail-reg">{vehicle.registration_no}</div>
        </div>
        <div className="detail-price-block">
          <div className="detail-price-label">Reserve Price</div>
          <div className="detail-price">{formatPrice(vehicle.reserve_price)}</div>
          {vehicle.emd_amount > 0 && (
            <div className="detail-emd">EMD: {formatPrice(vehicle.emd_amount)}</div>
          )}
        </div>
      </div>

      <div className="detail-body">
        <section className="detail-section">
          <h2 className="section-heading">Vehicle details</h2>
          <div className="detail-grid">
            {['make','model','year','registration_no','vehicle_type','condition','rc_status'].map(key => (
              vehicle[key] ? (
                <div key={key} className="detail-field">
                  <div className="field-label">{FIELD_LABELS[key]}</div>
                  <div className="field-value">{String(vehicle[key])}</div>
                </div>
              ) : null
            ))}
          </div>
        </section>

        <section className="detail-section">
          <h2 className="section-heading">Auction details</h2>
          <div className="detail-grid">
            <div className="detail-field">
              <div className="field-label">Reserve price</div>
              <div className="field-value price-highlight">{formatPrice(vehicle.reserve_price)}</div>
            </div>
            <div className="detail-field">
              <div className="field-label">EMD required</div>
              <div className="field-value">{formatPrice(vehicle.emd_amount)}</div>
            </div>
            {vehicle.bid_increment > 0 && (
              <div className="detail-field">
                <div className="field-label">Bid increment</div>
                <div className="field-value">{formatPrice(vehicle.bid_increment)}</div>
              </div>
            )}
            <div className="detail-field">
              <div className="field-label">Auction opens</div>
              <div className="field-value">{formatDateTime(vehicle.auction_start)}</div>
            </div>
            <div className="detail-field">
              <div className="field-label">Auction closes</div>
              <div className="field-value">{formatDateTime(vehicle.auction_end)}</div>
            </div>
            <div className="detail-field">
              <div className="field-label">Bank / NBFC</div>
              <div className="field-value">{vehicle.bank_name}</div>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h2 className="section-heading">Location &amp; contact</h2>
          <div className="detail-grid">
            <div className="detail-field">
              <div className="field-label">District</div>
              <div className="field-value capitalize">{vehicle.location_district}</div>
            </div>
            {vehicle.location_address && (
              <div className="detail-field full-width">
                <div className="field-label">Address</div>
                <div className="field-value">{vehicle.location_address}</div>
              </div>
            )}
            {vehicle.contact_person && (
              <div className="detail-field">
                <div className="field-label">Contact person</div>
                <div className="field-value">{vehicle.contact_person}</div>
              </div>
            )}
            {vehicle.contact_phone && (
              <div className="detail-field">
                <div className="field-label">Phone</div>
                <div className="field-value">
                  <a href={`tel:${vehicle.contact_phone}`}>{vehicle.contact_phone}</a>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="bid-cta-wrap">
          <div className="bid-disclaimer">
            Vehicles are sold on "as-is, where-is" basis. Inspect before bidding. 
            Verify all details with the bank directly.
          </div>
          {vehicle.auction_url && (
            <a href={vehicle.auction_url} target="_blank" rel="noopener noreferrer"
               className="bid-cta-btn">
              Bid on auction portal ↗
            </a>
          )}
          {vehicle.source_pdf_url && (
            <a href={vehicle.source_pdf_url} target="_blank" rel="noopener noreferrer"
               className="pdf-btn">
              View auction notice (PDF) ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
