# Kerala Bank Auction Vehicles — Full Stack App

## Project Structure
```
kerala-auction/
├── backend/           # Node.js + Express API server
│   ├── src/
│   │   ├── index.js              # Server entry point
│   │   ├── models/db.js          # SQLite database
│   │   ├── routes/
│   │   │   ├── vehicles.js       # Vehicle API endpoints
│   │   │   └── stats.js          # Stats endpoint
│   │   └── scrapers/
│   │       ├── run.js            # Scraper orchestrator
│   │       ├── mstcIbapi.js      # MSTC IBAPI scraper
│   │       └── bankPdf.js        # Bank PDF notice scraper
│   └── package.json
│
└── frontend/          # React app
    ├── public/index.html
    ├── src/
    │   ├── App.js
    │   ├── components/
    │   │   ├── Header.js
    │   │   ├── VehicleCard.js
    │   │   ├── FilterPanel.js
    │   │   └── StatsBanner.js
    │   └── pages/
    │       ├── HomePage.js
    │       └── DetailPage.js
    └── package.json
```

## Setup & Run

### Backend
```bash
cd backend
npm install
npm start
# API runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm start
# App opens at http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicles` | List vehicles (filterable, paginated) |
| GET | `/api/vehicles/:id` | Get vehicle detail |
| GET | `/api/vehicles/meta/filters` | Available filter options |
| GET | `/api/stats` | Dashboard statistics |
| POST | `/api/scrape` | Manually trigger scrapers |
| GET | `/api/health` | Health check |

## Filter Query Params (GET /api/vehicles)
- `district` — Kerala district name (e.g. ernakulam)
- `bank` — Bank name (partial match)
- `type` — Vehicle type: 2W, 3W, 4W, Commercial
- `condition` — Running, Average, Poor, Scrap
- `minPrice` / `maxPrice` — Reserve price range (₹)
- `search` — Free-text: make, model, reg no, bank
- `sortBy` — auction_end, reserve_price, created_at
- `page` / `limit` — Pagination

## Data Sources
1. **MSTC IBAPI** — mstcecommerce.com/auctionhome/ibapi  
   Used by: SBI, Canara Bank, Public Sector Banks
   
2. **Bank PDF Notices** — Parsed from bank websites:
   - ESAF Small Finance Bank
   - South Indian Bank
   - Federal Bank
   - Kerala Gramin Bank

## Scraper Schedule
Runs automatically at 6 AM and 6 PM daily (node-cron).
Trigger manually: `POST /api/scrape`

## Notes
- Data is stored in SQLite (`backend/data/auctions.db`)
- Vehicles are sold "as-is, where-is" — always verify with the bank
- MSTC portal may throttle automated requests; the scraper falls back to sample data
- Add Vahan API (vaahan.gov.in) integration for RC/ownership details
