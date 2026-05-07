const express = require('express');

const Article = require('../models/Article');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/history', requireAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const filter = { userId: req.user.id };
  if (q) {
    filter.text = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const items = await Article.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return res.json({ items });
});

module.exports = router;
