require('dotenv').config();

const { connectDb } = require('./config/db');

async function main() {
  const port = process.env.PORT || 5000;
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing JWT_SECRET');
  }

  await connectDb(mongoUri);

  const { createApp } = require('./app');
  const app = createApp();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
