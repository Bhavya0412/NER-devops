const mongoose = require('mongoose');

if (process.env.USE_DEV_FILE_DB === 'true') {
  module.exports = require('../devStore').User;
  return;
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: null, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: null },

    // Passwordless login (email code) fields
    loginCodeHash: { type: String, default: null },
    loginCodeExpiresAt: { type: Date, default: null },
    loginCodeAttempts: { type: Number, default: 0 },
    loginCodeLastSentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
