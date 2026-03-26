import mongoose from 'mongoose';
import { Opportunity } from '../models/opportunity.model';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function deduplicate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const keywords = ['επιταγή ακρίβειας', 'επιταγη ακριβειας', 'Δώρου Χριστουγέννων', 'Δώρου Πάσχα'];
    
    for (const kw of keywords) {
      console.log(`\nChecking duplicates for keyword: \${kw}`);
      const opps = await Opportunity.find({ 
        title: { $regex: kw, $options: 'i' },
        status: 'published'
      }).sort({ publishedAt: -1 });

      if (opps.length > 1) {
        console.log(`Found \${opps.length} matches. Keeping the most recent one...`);
        const [keep, ...others] = opps;
        console.log(`Keeping: \${keep.title} (\${keep._id})`);
        
        for (const other of others) {
          console.log(`Archiving duplicate: \${other.title} (\${other._id})`);
          other.status = 'archived';
          await other.save();
        }
      } else {
        console.log('No duplicates found.');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

deduplicate();
