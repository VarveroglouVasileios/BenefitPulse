import mongoose from 'mongoose';
import { config } from '../config/env';

export async function connectMongo(): Promise<void> {
  try {
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
