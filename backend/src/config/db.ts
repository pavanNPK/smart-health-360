import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.DB_URL;
  if (!uri) {
    throw new Error('DB_URL is not defined in environment');
  }
  await mongoose.connect(uri);
  const dbName = getDbName();
  console.log('MongoDB connected (database: ' + dbName + ')');
}

export function getDbName(): string {
  const uri = process.env.DB_URL || '';
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : 'medical_coding';
}
