const express = require('express');
const { z } = require('zod');

const Article = require('../models/Article');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.delete('/:id', requireAuth, async (req, res) => {
  const idSchema = z.object({ id: z.string().min(1) });
  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid id' });

  const { id } = parsed.data;

  const deleted = await Article.findOneAndDelete({ _id: id, userId: req.user.id });
  if (!deleted) return res.status(404).json({ message: 'Not found' });

  return res.json({ ok: true });
});

module.exports = router;
