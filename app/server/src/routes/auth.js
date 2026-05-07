const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { signJwt, setAuthCookie, clearAuthCookie } = require('../services/jwt');
const {
  normalizeEmail,
  generateSixDigitCode,
  hashLoginCode,
  getLoginCodeTtlMs,
  getMinResendIntervalMs
} = require('../services/loginCode');
const { sendLoginCodeEmail } = require('../services/mailer');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128)
});

const signupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128)
});

const requestCodeSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128)
});

const verifyCodeSchema = z.object({
  email: z.string().email().max(320),
  code: z.string().regex(/^\d{6}$/)
});

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const name = parsed.data.name.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already in use' });

  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hash });

  return res.status(201).json({ user: { id: String(user._id), email: user.email, name: user.name } });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  if (!user.password) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signJwt(user);
  setAuthCookie(res, token);

  return res.json({ user: { id: String(user._id), email: user.email, name: user.name } });
});

// Passwordless login: request a 6-digit code by email.
// Always returns ok:true to avoid account enumeration.
router.post('/request-code', async (req, res) => {
  const parsed = requestCodeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const email = normalizeEmail(parsed.data.email);
  const password = parsed.data.password;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'Account not found' });

  if (!user.password) return res.status(401).json({ message: 'Invalid credentials' });

  const okPassword = await bcrypt.compare(password, user.password);
  if (!okPassword) return res.status(401).json({ message: 'Invalid credentials' });

  const now = new Date();
  const minIntervalMs = getMinResendIntervalMs();
  if (user.loginCodeLastSentAt && now.getTime() - user.loginCodeLastSentAt.getTime() < minIntervalMs) {
    return res.json({ ok: true });
  }

  const code = generateSixDigitCode();
  user.loginCodeHash = hashLoginCode({ email, code });
  user.loginCodeExpiresAt = new Date(now.getTime() + getLoginCodeTtlMs());
  user.loginCodeAttempts = 0;
  user.loginCodeLastSentAt = now;
  await user.save();

  try {
    await sendLoginCodeEmail({ to: email, code });
    return res.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[auth/request-code] email delivery failed:', e);
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    const message = isDev ? e?.message || 'Failed to send email' : 'Failed to send email';
    return res.status(500).json({ message });
  }
});

// Passwordless login: verify the 6-digit code.
router.post('/verify-code', async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const email = normalizeEmail(parsed.data.email);
  const code = parsed.data.code;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid code' });

  const now = new Date();
  if (!user.loginCodeHash || !user.loginCodeExpiresAt || user.loginCodeExpiresAt.getTime() < now.getTime()) {
    return res.status(401).json({ message: 'Invalid code' });
  }

  if ((user.loginCodeAttempts || 0) >= 8) {
    return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
  }

  const expected = user.loginCodeHash;
  const actual = hashLoginCode({ email, code });
  const ok = cryptoSafeEqual(expected, actual);
  if (!ok) {
    user.loginCodeAttempts = (user.loginCodeAttempts || 0) + 1;
    await user.save();
    return res.status(401).json({ message: 'Invalid code' });
  }

  // Clear one-time code after successful login
  user.loginCodeHash = null;
  user.loginCodeExpiresAt = null;
  user.loginCodeAttempts = 0;
  await user.save();

  const token = signJwt(user);
  setAuthCookie(res, token);
  return res.json({ user: { id: String(user._id), email: user.email, name: user.name } });
});

function cryptoSafeEqual(a, b) {
  try {
    const ba = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    if (ba.length !== bb.length) return false;
    return require('crypto').timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name } });
});

module.exports = router;
