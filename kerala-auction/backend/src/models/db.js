const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/auctions.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      source          TEXT NOT NULL,           -- 'mstc_ibapi' | 'esaf_pdf' | 'sib_pdf' | ...
      external_id     TEXT,                    -- source-specific unique ID
      bank_name       TEXT NOT NULL,
      vehicle_type    TEXT,                    -- '2W' | '3W' | '4W' | 'Commercial' | 'Other'
      make            TEXT,
      model           TEXT,
      year            INTEGER,
      registration_no TEXT,
      condition       TEXT,                    -- 'Running' | 'Average' | 'Poor' | 'Scrap'
      rc_status       TEXT,                    -- 'Yes' | 'No'
      location_district TEXT,
      location_address  TEXT,
      reserve_price   REAL,
      emd_amount      REAL,
      bid_increment   REAL,
      auction_start   TEXT,                    -- ISO datetime string
      auction_end     TEXT,
      contact_person  TEXT,
      contact_phone   TEXT,
      auction_url     TEXT,
      source_pdf_url  TEXT,
      raw_data        TEXT,                    -- JSON blob of original scraped data
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(source, external_id)
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_bank       ON vehicles(bank_name);
    CREATE INDEX IF NOT EXISTS idx_vehicles_type       ON vehicles(vehicle_type);
    CREATE INDEX IF NOT EXISTS idx_vehicles_district   ON vehicles(location_district);
    CREATE INDEX IF NOT EXISTS idx_vehicles_auction_end ON vehicles(auction_end);
    CREATE INDEX IF NOT EXISTS idx_vehicles_reserve    ON vehicles(reserve_price);

    CREATE TABLE IF NOT EXISTS scrape_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT NOT NULL,
      status      TEXT NOT NULL,   -- 'success' | 'error'
      records     INTEGER DEFAULT 0,
      message     TEXT,
      scraped_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('[DB] Database initialized at', DB_PATH);
  return db;
}

module.exports = { getDb, initDb };
