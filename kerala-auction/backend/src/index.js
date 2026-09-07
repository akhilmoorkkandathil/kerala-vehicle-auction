const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cron = require('node-cron');

const { initDb } = require('./models/db');
const vehicleRoutes = require('./routes/vehicles');
const statsRoutes = require('./routes/stats');
const { runAllScrapers } = require('./scrapers/run');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
    ].filter(Boolean);
    // Allow Vercel preview URLs and any configured origin
    if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// Routes
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual scrape trigger
app.post('/api/scrape', async (req, res) => {
  res.json({ message: 'Scrape job started' });
  runAllScrapers().catch(console.error);
});

// Schedule scraper: every day at 6 AM and 6 PM
cron.schedule('0 6,18 * * *', () => {
  console.log('[CRON] Running scheduled scrape...');
  runAllScrapers().catch(console.error);
});

// Start server
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🚗 Kerala Auction Backend running on port ${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api\n`);
    runAllScrapers().catch(console.error);
  });
}

start();
