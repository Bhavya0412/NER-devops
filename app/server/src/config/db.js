const mongoose = require('mongoose');

async function connectDb(mongoUri) {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 3000)
    });
    process.env.USE_DEV_FILE_DB = 'false';
    return mongoose.connection;
  } catch (err) {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    if (!isDev) throw err;

    process.env.USE_DEV_FILE_DB = 'true';
    console.warn(
      `[db] MongoDB unavailable at ${mongoUri}. Using local dev file store instead.`
    );
    return null;
  }
}

module.exports = { connectDb };
