import React from 'react';
import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-brand">
          <span className="brand-icon" aria-hidden="true">🚗</span>
          <div>
            <div className="brand-name">KeralaAuctions</div>
            <div className="brand-sub">Bank Auction Vehicles</div>
          </div>
        </div>
        <nav className="header-nav">
          <a href="#listings" className="nav-link">Listings</a>
          <a href="https://www.mstcecommerce.com/auctionhome/ibapi/index.jsp"
             target="_blank" rel="noopener noreferrer" className="nav-link">
            Bid on MSTC ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
