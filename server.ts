import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import connectDB from './db/connect.js';

// Import routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import userRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import healthRoutes from './routes/health.js';
import aiRoutes from './routes/ai.js';
import storeRoutes from './routes/stores.js';
import inventoryRoutes from './routes/store-inventory.js';
import receiptRoutes from './routes/receipts.js';
import uploadRoutes from './routes/uploads.js';
import itemsNotFoundRoutes from './routes/items-not-found.js';
import driverRoutes from './routes/driver.js';
import priceIntelligenceRoutes from './routes/price-intelligence.js';
import bottleReturnRoutes from './routes/bottle-returns.js';
import returnRoutes from './routes/returns.js';
import cashPayoutRoutes from './routes/cash-payouts.js';

import { createServer as createHttpServer } from 'http';
import { initSocket } from './services/socketService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const PORT = 3000;

  // Initialize Socket.io
  const io = initSocket(httpServer);
  app.locals.io = io;

  // Connect to DB
  await connectDB();

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/stores', storeRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/receipts', receiptRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/driver', itemsNotFoundRoutes);
  app.use('/api/driver', driverRoutes);
  app.use('/api/price-intelligence', priceIntelligenceRoutes);
  app.use('/api/bottle-returns', bottleReturnRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/cash-payouts', cashPayoutRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
