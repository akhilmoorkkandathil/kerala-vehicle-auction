/**
 * Bank PDF Scraper
 * Fetches and parses auction PDF notices published by banks on their websites.
 * Currently targets: ESAF Bank, South Indian Bank, Federal Bank, Kerala Gramin Bank
 *
 * Strategy:
 * 1. Fetch the bank's auction listing page
 * 2. Find PDF links that match vehicle auction patterns
 * 3. Download each PDF and extract structured data
 * 4. Filter for Kerala-based vehicles
 */

const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const { getDb } = require('../models/db');

// Bank PDF index pages to crawl
const BANK_SOURCES = [
  {
    id: 'esaf_bank',
    name: 'ESAF Small Finance Bank',
    auctionPage: 'https://www.esaf.bank.in/auctions/',
    pdfPattern: /kerala.*\d{2,4}/i,
    type: 'listing_page'
  },
  {
    id: 'sib',
    name: 'South Indian Bank',
    auctionPage: 'https://www.southindianbank.com/sale-notices',
    pdfPattern: /sale.notice|vehicle|auction/i,
    type: 'listing_page'
  },
  {
    id: 'federal_bank',
    name: 'Federal Bank',
    auctionPage: 'https://www.federalbank.co.in/e-auction',
    pdfPattern: /auction|vehicle|sarfaesi/i,
    type: 'listing_page'
  },
  {
    id: 'kgb',
    name: 'Kerala Gramin Bank',
    auctionPage: 'https://kgb.bank.in/public/tenders',
    pdfPattern: /vehicle|auction|disposal/i,
    type: 'listing_page'
  }
];

// Regex patterns to extract fields from PDF text
const PATTERNS = {
  regNo: /(?:reg(?:istration)?\.?\s*no\.?|vehicle\s+no\.?|reg\.?\s*number)\s*[:\-]?\s*([A-Z]{2}[\s\-]?\d{1,2}[\s\-][A-Z]{1,3}[\s\-]?\d{1,4})/gi,
  make: /(?:make|manufacturer|vehicle\s+make)\s*[:\-]?\s*([A-Za-z\s]+?)(?:\n|model|year)/gi,
  model: /(?:model)\s*[:\-]?\s*([A-Za-z0-9\s]+?)(?:\n|year|reg|price)/gi,
  year: /(?:year\s+of\s+mfg|year\s+of\s+manufacture|year)\s*[:\-]?\s*(\d{4})/gi,
  reservePrice: /(?:reserve\s+price|base\s+price|minimum\s+price)\s*[:\-]?\s*(?:rs\.?\s*)?([0-9,]+)/gi,
  emd: /(?:emd|earnest\s+money)\s*[:\-]?\s*(?:rs\.?\s*)?([0-9,]+)/gi,
  auctionDate: /(?:auction\s+date|date\s+of\s+auction|e\-auction)\s*[:\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/gi,
  contact: /(?:contact|mobile|phone)\s*[:\-]?\s*(\+?91?[\s\-]?[6-9]\d{9})/gi,
  district: new RegExp(
    `(thiruvananthapuram|kollam|pathanamthitta|alappuzha|kottayam|idukki|` +
    `ernakulam|thrissur|palakkad|malappuram|kozhikode|wayanad|kannur|kasaragod|` +
    `kochi|trivandrum|calicut|trichur)`, 'gi'
  )
};

function extractFirst(text, regex) {
  regex.lastIndex = 0;
  const match = regex.exec(text);
  return match ? match[1].trim() : null;
}

function extractAll(text, regex) {
  regex.lastIndex = 0;
  const results = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

function parsePriceStr(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '')) || 0;
}

function parseDateStr(str) {
  if (!str) return null;
  // Handle dd-mm-yyyy, dd/mm/yyyy, dd.mm.yyyy
  const parts = str.split(/[\-\/\.]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) y = '20' + y;
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`).toISOString();
  }
  return null;
}

function classifyVehicleType(text = '') {
  const t = text.toLowerCase();
  if (t.includes('3w') || t.includes('three wheel') || t.includes('ape') || t.includes('auto')) return '3W';
  if (t.includes('2w') || t.includes('two wheel') || t.includes('bike') ||
      t.includes('motorcycle') || t.includes('scooter') || t.includes('activa') ||
      t.includes('splendor') || t.includes('bajaj') || t.includes('hero')) return '2W';
  if (t.includes('truck') || t.includes('lorry') || t.includes('bus') ||
      t.includes('commercial') || t.includes('signa') || t.includes('ace')) return 'Commercial';
  return '4W';
}

async function parsePdfBuffer(buffer, bankInfo, pdfUrl) {
  let data;
  try {
    data = await pdfParse(buffer);
  } catch (e) {
    console.warn('[PDF] Parse error:', e.message);
    return [];
  }

  const text = data.text;

  // Skip if not a vehicle auction PDF
  if (!/(vehicle|car|bike|motorcycle|two\s+wheel|four\s+wheel|3w|2w)/i.test(text)) {
    return [];
  }

  // Skip if not Kerala-related
  if (!/(kerala|kl[\s\-]\d)/i.test(text)) {
    return [];
  }

  const regNos = extractAll(text, PATTERNS.regNo);
  const results = [];

  if (regNos.length === 0) {
    // Single vehicle notice
    const record = buildRecord(text, bankInfo, pdfUrl, 0);
    if (record) results.push(record);
  } else {
    // Multi-vehicle PDF (like ESAF bulk listings)
    for (let i = 0; i < regNos.length; i++) {
      const record = buildRecord(text, bankInfo, pdfUrl, i, regNos[i]);
      if (record) results.push(record);
    }
  }

  return results;
}

function buildRecord(text, bankInfo, pdfUrl, idx, regNo = null) {
  if (!regNo) {
    regNo = extractFirst(text, PATTERNS.regNo);
  }
  if (!regNo) return null;

  const reservePriceStr = extractFirst(text, PATTERNS.reservePrice);
  const emdStr = extractFirst(text, PATTERNS.emd);
  const auctionDateStr = extractFirst(text, PATTERNS.auctionDate);
  const districtMatch = extractFirst(text, PATTERNS.district);
  const phones = extractAll(text, PATTERNS.contact);

  return {
    source: bankInfo.id,
    external_id: `${bankInfo.id}-${regNo.replace(/\s/g,'')}`,
    bank_name: bankInfo.name,
    vehicle_type: classifyVehicleType(text),
    make: extractFirst(text, PATTERNS.make) || '',
    model: extractFirst(text, PATTERNS.model) || '',
    year: parseInt(extractFirst(text, PATTERNS.year)) || null,
    registration_no: regNo,
    condition: /running/i.test(text) ? 'Running' : /average/i.test(text) ? 'Average' : 'Unknown',
    rc_status: /rc.*(yes|available)/i.test(text) ? 'Yes' : 'Unknown',
    location_district: districtMatch ? districtMatch.toLowerCase() : 'Kerala',
    location_address: '',
    reserve_price: parsePriceStr(reservePriceStr),
    emd_amount: parsePriceStr(emdStr),
    bid_increment: 0,
    auction_start: parseDateStr(auctionDateStr),
    auction_end: parseDateStr(auctionDateStr),
    contact_person: '',
    contact_phone: phones[0] || '',
    auction_url: pdfUrl,
    source_pdf_url: pdfUrl,
    raw_data: JSON.stringify({ regNo, reservePriceStr, emdStr, auctionDateStr })
  };
}

async function fetchPdfLinks(bank) {
  try {
    const resp = await axios.get(bank.auctionPage, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AuctionBot/1.0)' }
    });
    const $ = cheerio.load(resp.data);
    const links = [];

    $('a[href$=".pdf"], a[href*=".pdf"]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text();
      if (bank.pdfPattern.test(href) || bank.pdfPattern.test(text)) {
        const url = href.startsWith('http') ? href : new URL(href, bank.auctionPage).href;
        links.push(url);
      }
    });

    return links.slice(0, 10); // Limit to 10 most recent PDFs per bank
  } catch (e) {
    console.warn(`[PDF] Could not fetch links from ${bank.name}:`, e.message);
    return [];
  }
}

async function scrapeAndSave() {
  const db = getDb();
  let totalSaved = 0;

  const upsert = db.prepare(`
    INSERT INTO vehicles
      (source, external_id, bank_name, vehicle_type, make, model, year,
       registration_no, condition, rc_status, location_district, location_address,
       reserve_price, emd_amount, bid_increment, auction_start, auction_end,
       contact_person, contact_phone, auction_url, source_pdf_url, raw_data, updated_at)
    VALUES
      (@source, @external_id, @bank_name, @vehicle_type, @make, @model, @year,
       @registration_no, @condition, @rc_status, @location_district, @location_address,
       @reserve_price, @emd_amount, @bid_increment, @auction_start, @auction_end,
       @contact_person, @contact_phone, @auction_url, @source_pdf_url, @raw_data,
       datetime('now'))
    ON CONFLICT(source, external_id) DO UPDATE SET
      reserve_price = excluded.reserve_price,
      auction_start = excluded.auction_start,
      auction_end   = excluded.auction_end,
      updated_at    = datetime('now')
  `);

  for (const bank of BANK_SOURCES) {
    console.log(`[PDF] Scraping ${bank.name}...`);
    const pdfLinks = await fetchPdfLinks(bank);
    console.log(`[PDF] Found ${pdfLinks.length} PDF(s) for ${bank.name}`);

    for (const link of pdfLinks) {
      try {
        const resp = await axios.get(link, {
          responseType: 'arraybuffer',
          timeout: 15000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AuctionBot/1.0)' }
        });

        const records = await parsePdfBuffer(Buffer.from(resp.data), bank, link);
        for (const rec of records) {
          try {
            upsert.run(rec);
            totalSaved++;
          } catch (_) {}
        }
      } catch (e) {
        console.warn(`[PDF] Failed to fetch ${link}:`, e.message);
      }
    }
  }

  // Add sample PDF-sourced data for development
  const samplePdfRecords = getMockPdfData();
  for (const rec of samplePdfRecords) {
    try { upsert.run(rec); totalSaved++; } catch (_) {}
  }

  console.log(`[PDF] Total saved: ${totalSaved}`);
  return { saved: totalSaved };
}

function getMockPdfData() {
  return [
    {
      source: 'esaf_bank', external_id: 'esaf-KL21U5618',
      bank_name: 'ESAF Small Finance Bank', vehicle_type: '3W',
      make: 'Piaggio', model: 'Ape City', year: 2020,
      registration_no: 'KL-21-U-5618', condition: 'Average',
      rc_status: 'Yes', location_district: 'thiruvananthapuram',
      location_address: 'Mannanthala, Thiruvananthapuram',
      reserve_price: 45000, emd_amount: 5000, bid_increment: 500,
      auction_start: new Date(Date.now() + 2 * 86400000).toISOString(),
      auction_end: new Date(Date.now() + 2 * 86400000).toISOString(),
      contact_person: 'Abhilash Jeevanand', contact_phone: '9072305397',
      auction_url: 'https://www.esaf.bank.in/auctions/',
      source_pdf_url: 'https://www.esaf.bank.in/wp-content/uploads/2026/01/Kerala-Jan-26.pdf',
      raw_data: '{}'
    },
    {
      source: 'esaf_bank', external_id: 'esaf-KL19N9759',
      bank_name: 'ESAF Small Finance Bank', vehicle_type: '2W',
      make: 'Benling India Energy', model: 'Aura Li', year: 2023,
      registration_no: 'KL-19-N-9759', condition: 'Average',
      rc_status: 'Yes', location_district: 'thiruvananthapuram',
      location_address: 'Balaramapuram, Thiruvananthapuram',
      reserve_price: 41000, emd_amount: 4100, bid_increment: 500,
      auction_start: new Date(Date.now() + 1 * 86400000).toISOString(),
      auction_end: new Date(Date.now() + 1 * 86400000).toISOString(),
      contact_person: 'Adarsh S S', contact_phone: '9072301385',
      auction_url: 'https://www.esaf.bank.in/auctions/',
      source_pdf_url: 'https://www.esaf.bank.in/wp-content/uploads/2026/01/Kerala-Jan-26.pdf',
      raw_data: '{}'
    },
    {
      source: 'sib', external_id: 'sib-KL08Z1234',
      bank_name: 'South Indian Bank', vehicle_type: '4W',
      make: 'Mahindra', model: 'Scorpio S7', year: 2016,
      registration_no: 'KL-08-Z-1234', condition: 'Running',
      rc_status: 'Yes', location_district: 'ernakulam',
      location_address: 'SIB Yard, Kakkanad, Ernakulam',
      reserve_price: 520000, emd_amount: 52000, bid_increment: 10000,
      auction_start: new Date(Date.now() + 6 * 86400000).toISOString(),
      auction_end: new Date(Date.now() + 9 * 86400000).toISOString(),
      contact_person: 'Recovery Officer', contact_phone: '9400112233',
      auction_url: 'https://www.southindianbank.com/sale-notices',
      source_pdf_url: null, raw_data: '{}'
    },
    {
      source: 'kgb', external_id: 'kgb-KL10AN7639',
      bank_name: 'Kerala Gramin Bank', vehicle_type: '4W',
      make: 'Maruti Suzuki', model: 'Swift LXI', year: 2013,
      registration_no: 'KL-10-AN-7639', condition: 'Average',
      rc_status: 'Yes', location_district: 'malappuram',
      location_address: 'KGB HO, Malappuram',
      reserve_price: 0, emd_amount: 0, bid_increment: 0,
      auction_start: null, auction_end: null,
      contact_person: 'Harikrishnan K', contact_phone: '9400999907',
      auction_url: 'https://kgb.bank.in/public/tenders',
      source_pdf_url: 'https://kgb.bank.in/public/tenderfiles/RFP-Vehicle-disposal-KL-10-AN-7639-161025.pdf',
      raw_data: '{}'
    }
  ];
}

module.exports = { scrapeAndSave };
