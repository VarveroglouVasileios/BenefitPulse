import { connectMongo } from './mongo';
import '../models';

export async function ensureIndexes(): Promise<void> {
  await connectMongo();
  console.log('✅ Indexes ensured');
}
