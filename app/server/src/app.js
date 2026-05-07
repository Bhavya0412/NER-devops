const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const nerRoutes = require('./routes/ner');
const historyRoutes = require('./routes/history');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(morgan('dev'));

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  app.use(
    cors({
      origin: clientOrigin,
      credentials: true
    })
  );

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false
    })
  );

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use('/auth', authRoutes);
  app.use('/user', userRoutes);
  app.use('/ner', nerRoutes);
  app.use('/history', historyRoutes);

  // Basic error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
