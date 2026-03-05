import { Opportunity } from '../models/opportunity.model';
import { connectMongo } from '../db/mongo';

async function createIndexes() {
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
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
