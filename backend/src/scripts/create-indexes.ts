import { Opportunity } from '../models/opportunity.model';
import { connectMongo } from '../db/mongo';

export async function createIndexes() {
  try {
    await connectMongo();
    console.log('Connected to MongoDB');

    console.log('Creating indexes...');
    // Drop all indexes to resolve conflicts
    try {
        await Opportunity.collection.dropIndexes();
        console.log('Dropped existing indexes.');
    } catch (e) {
        console.log('No indexes to drop or error dropping:', e);
    }

    await Opportunity.ensureIndexes();
    
    console.log('Indexes created successfully');
    // Don't process.exit(0) here because it kills the CLI runner
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}

// Support running directly or via CLI runner
if (require.main === module) {
  createIndexes().then(() => process.exit(0)).catch(() => process.exit(1));
}
