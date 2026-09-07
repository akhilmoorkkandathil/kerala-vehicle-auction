const express = require('express');
const router  = express.Router();
const { getDb } = require('../models/db');

router.get('/', (req, res) => {
  try {
    const db = getDb();

    const total      = db.prepare(`SELECT COUNT(*) as c FROM vehicles`).get().c;
    const byType     = db.prepare(`SELECT vehicle_type, COUNT(*) as c FROM vehicles GROUP BY vehicle_type ORDER BY c DESC`).all();
    const byBank     = db.prepare(`SELECT bank_name, COUNT(*) as c FROM vehicles GROUP BY bank_name ORDER BY c DESC LIMIT 10`).all();
    const byDistrict = db.prepare(`SELECT LOWER(location_district) as d, COUNT(*) as c FROM vehicles GROUP BY d ORDER BY c DESC`).all();
    const upcoming   = db.prepare(`SELECT COUNT(*) as c FROM vehicles WHERE auction_end >= datetime('now')`).get().c;
    const lastScrape = db.prepare(`SELECT scraped_at FROM scrape_logs ORDER BY id DESC LIMIT 1`).get();

    res.json({ total, upcoming, byType, byBank, byDistrict, lastScrapeAt: lastScrape?.scraped_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
