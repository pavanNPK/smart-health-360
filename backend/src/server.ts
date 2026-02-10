import 'dotenv/config';
import { connectDB } from './config/db';
import app from './app';

const PORT = process.env.APP_PORT || 3000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
