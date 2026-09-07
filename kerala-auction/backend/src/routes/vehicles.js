const express = require('express');
const router  = express.Router();
const { getDb } = require('../models/db');

const KERALA_DISTRICTS = [
  'thiruvananthapuram','kollam','pathanamthitta','alappuzha','kottayam',
  'idukki','ernakulam','thrissur','palakkad','malappuram','kozhikode',
  'wayanad','kannur','kasaragod'
];

/**
 * GET /api/vehicles
 * Query params:
 *   district, bank, type (2W|3W|4W|Commercial), condition,
 *   minPrice, maxPrice, search, page, limit, sortBy, sortDir
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const {
      district, bank, type, condition,
      minPrice, maxPrice, search,
      page = 1, limit = 20,
      sortBy = 'auction_end', sortDir = 'ASC'
    } = req.query;

    const where = ['1=1'];
    const params = {};

    if (district) {
      where.push(`LOWER(location_district) = LOWER(@district)`);
      params.district = district;
    }
    if (bank) {
      where.push(`bank_name LIKE @bank`);
      params.bank = `%${bank}%`;
    }
    if (type) {
      where.push(`vehicle_type = @type`);
      params.type = type;
    }
    if (condition) {
      where.push(`condition = @condition`);
      params.condition = condition;
    }
    if (minPrice) {
      where.push(`reserve_price >= @minPrice`);
      params.minPrice = parseFloat(minPrice);
    }
    if (maxPrice) {
      where.push(`reserve_price <= @maxPrice`);
      params.maxPrice = parseFloat(maxPrice);
    }
    if (search) {
      where.push(`(make LIKE @search OR model LIKE @search OR registration_no LIKE @search OR bank_name LIKE @search)`);
      params.search = `%${search}%`;
    }

    const whereClause = where.join(' AND ');
    const validSortCols = ['reserve_price','auction_end','auction_start','make','bank_name','created_at'];
    const col = validSortCols.includes(sortBy) ? sortBy : 'auction_end';
    const dir = sortDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM vehicles WHERE ${whereClause}`)
      .get(params).cnt;

    const rows = db.prepare(`
      SELECT * FROM vehicles
      WHERE ${whereClause}
      ORDER BY
        CASE WHEN ${col} IS NULL OR ${col} = '' THEN 1 ELSE 0 END,
        ${col} ${dir}
      LIMIT @limit OFFSET @offset
    `).all({ ...params, limit: limitNum, offset });

    res.json({
      data: rows,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/vehicles/:id
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM vehicles WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/vehicles/meta/filters
 * Returns available filter options (banks, districts, types)
 */
router.get('/meta/filters', (req, res) => {
  try {
    const db = getDb();
    const banks     = db.prepare(`SELECT DISTINCT bank_name FROM vehicles ORDER BY bank_name`).all().map(r => r.bank_name);
    const types     = db.prepare(`SELECT DISTINCT vehicle_type FROM vehicles WHERE vehicle_type IS NOT NULL ORDER BY vehicle_type`).all().map(r => r.vehicle_type);
    const districts = db.prepare(`SELECT DISTINCT LOWER(location_district) as d FROM vehicles ORDER BY d`).all().map(r => r.d);
    const conditions = db.prepare(`SELECT DISTINCT condition FROM vehicles WHERE condition IS NOT NULL ORDER BY condition`).all().map(r => r.condition);
    const priceRange = db.prepare(`SELECT MIN(reserve_price) as min, MAX(reserve_price) as max FROM vehicles WHERE reserve_price > 0`).get();

    res.json({ banks, types, districts, conditions, priceRange, keralaDistricts: KERALA_DISTRICTS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
