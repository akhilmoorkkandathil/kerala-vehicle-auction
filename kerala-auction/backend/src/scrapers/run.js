const { getDb } = require('../models/db');
const mstcScraper = require('./mstcIbapi');
const pdfScraper  = require('./bankPdf');

async function runAllScrapers() {
  const db = getDb();
  const log = db.prepare(
    `INSERT INTO scrape_logs (source, status, records, message) VALUES (?, ?, ?, ?)`
  );

  console.log('\n[SCRAPER] Starting all scrapers...');

  for (const [name, scraper] of [['mstc_ibapi', mstcScraper], ['bank_pdf', pdfScraper]]) {
    try {
      const result = await scraper.scrapeAndSave();
      log.run(name, 'success', result.saved || 0, 'OK');
      console.log(`[SCRAPER] ✓ ${name}: ${result.saved} records saved`);
    } catch (err) {
      log.run(name, 'error', 0, err.message);
      console.error(`[SCRAPER] ✗ ${name}:`, err.message);
    }
  }

  console.log('[SCRAPER] All scrapers complete.\n');
}

// Allow running directly: node src/scrapers/run.js
if (require.main === module) {
  const { initDb } = require('../models/db');
  initDb();
  runAllScrapers().then(() => process.exit(0));
}

module.exports = { runAllScrapers };
