const nodemailer = require('nodemailer');

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

async function sendLoginCodeEmail({ to, code }) {
  const delivery = process.env.LOGIN_CODE_DELIVERY || 'auto';
  const from = process.env.EMAIL_FROM || 'no-reply@ner.local';

  // Dev/test fallback: log to console
  if (delivery === 'log') {
    // eslint-disable-next-line no-console
    console.log(`[login-code] ${to} -> ${code}`);
    return { delivered: false };
  }

  if (!isEmailConfigured()) {
    const missing = [
      !process.env.SMTP_HOST ? 'SMTP_HOST' : null,
      !process.env.SMTP_PORT ? 'SMTP_PORT' : null
    ].filter(Boolean);
    throw new Error(`SMTP not configured (missing ${missing.join(', ')})`);
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPassRaw = process.env.SMTP_PASS;
  const smtpPass = typeof smtpPassRaw === 'string' ? smtpPassRaw.replace(/\s+/g, '') : '';

  if (smtpUser && !smtpPass) {
    throw new Error('SMTP_PASS is required when SMTP_USER is set');
  }

  const port = Number(process.env.SMTP_PORT);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: smtpUser
      ? {
          user: smtpUser,
          pass: smtpPass
        }
      : undefined
  });

  await transporter.sendMail({
    from,
    to,
    subject: 'Your sign-in code',
    text: `Your sign-in code is: ${code}. It expires soon.`,
    html: `<p>Your sign-in code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>This code expires soon.</p>`
  });

  return { delivered: true };
}

module.exports = { sendLoginCodeEmail };
