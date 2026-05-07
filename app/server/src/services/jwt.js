const jwt = require('jsonwebtoken');

function signJwt(user) {
  return jwt.sign(
    { email: user.email, name: user.name ?? undefined },
    process.env.JWT_SECRET,
    {
      subject: String(user._id),
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
}

module.exports = { signJwt, setAuthCookie, clearAuthCookie };
