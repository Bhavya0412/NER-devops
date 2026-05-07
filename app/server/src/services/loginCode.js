const crypto = require('crypto');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function generateSixDigitCode() {
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  return code;
}

function hashLoginCode({ email, code }) {
  const secret = process.env.LOGIN_CODE_SECRET || process.env.JWT_SECRET || 'dev-secret';
  return crypto
    .createHash('sha256')
    .update(`${normalizeEmail(email)}:${code}:${secret}`)
    .digest('hex');
}

function getLoginCodeTtlMs() {
  const minutes = Number(process.env.LOGIN_CODE_TTL_MINUTES || 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return 10 * 60 * 1000;
  return minutes * 60 * 1000;
}

function getMinResendIntervalMs() {
  const seconds = Number(process.env.LOGIN_CODE_RESEND_SECONDS || 30);
  if (!Number.isFinite(seconds) || seconds < 0) return 30 * 1000;
  return seconds * 1000;
}

module.exports = {
  normalizeEmail,
  generateSixDigitCode,
  hashLoginCode,
  getLoginCodeTtlMs,
  getMinResendIntervalMs
};
