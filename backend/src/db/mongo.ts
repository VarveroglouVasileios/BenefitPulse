import mongoose from 'mongoose';
import { config } from '../config/env';

export async function connectMongo(): Promise<void> {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
