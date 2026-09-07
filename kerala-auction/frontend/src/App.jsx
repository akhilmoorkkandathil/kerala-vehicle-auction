import React, { useState } from 'react';
import Header from './components/Header.jsx';
import HomePage from './pages/HomePage.jsx';
import DetailPage from './pages/DetailPage.jsx';
import './App.css';

export default function App() {
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        {selectedVehicleId
          ? <DetailPage id={selectedVehicleId} onBack={() => setSelectedVehicleId(null)} />
          : <HomePage onSelect={setSelectedVehicleId} />
        }
      </main>
      <footer className="app-footer">
        <div className="footer-inner">
          <span>Kerala Bank Auction Vehicles</span>
          <span className="footer-sep">·</span>
          <span>Data sourced from MSTC IBAPI &amp; bank PDFs</span>
          <span className="footer-sep">·</span>
          <span>Always verify with the bank before bidding</span>
        </div>
      </footer>
    </div>
  );
}
