import mongoose from 'mongoose';
import { Opportunity } from '../models/opportunity.model';
import { Source } from '../models/source.model';
import dotenv from 'dotenv';
import path from 'path';

// Load production environment variables
// Note: .env.production is in the root directory according to previous cat command
dotenv.config({ path: path.resolve(__dirname, '../../../.env.production') });

async function auditProduction() {
  try {
    const baseUri = process.env.MONGODB_URI;
    if (!baseUri) {
      throw new Error('MONGODB_URI not found in .env.production');
    }

    // Try to connect to 'benefitpulse' database
    const prodUri = baseUri.endsWith('/') ? baseUri + 'benefitpulse' : baseUri + '/benefitpulse';
    
    console.log('Connecting to Production DB...');
    await mongoose.connect(prodUri);
    console.log('✅ Connected to MongoDB Production');

    // 1. Check Sources
    const sources = await Source.find({}).lean();
    console.log(`\n📊 PRODUCTION SOURCES (${sources.length}):`);
    sources.forEach(s => {
      console.log(`- [${s.enabled ? 'ENABLED' : 'DISABLED'}] ${s.name} (${s.type}) -> ${s.url}`);
    });

    // 2. Check Opportunities
    const opportunities = await Opportunity.find({ status: 'published' }).lean();
    console.log(`\n📊 PUBLISHED OPPORTUNITIES (${opportunities.length}):`);

    const now = new Date();
    const expired: any[] = [];
    const duplicates = new Map<string, any[]>();
    const missingDeadlines: any[] = [];

    for (const opp of opportunities) {
      // Check for expiration
      if (opp.deadlineAt && new Date(opp.deadlineAt) < now) {
        expired.push(opp);
      }

      // Check for missing deadlines
      if (!opp.deadlineAt && opp.type !== 'manual') {
        missingDeadlines.push(opp);
      }

      // Check for duplicates (by title or URL)
      const key = opp.title.toLowerCase().trim();
      if (!duplicates.has(key)) {
        duplicates.set(key, []);
      }
      duplicates.get(key)!.push(opp);
    }

    console.log(`\n❌ EXPIRED BUT PUBLISHED (${expired.length}):`);
    expired.forEach(o => console.log(`- ${o.title} (Deadline: ${o.deadlineAt})`));

    console.log(`\n👯 POTENTIAL DUPLICATES:`);
    let duplicateCount = 0;
    duplicates.forEach((list, title) => {
      if (list.length > 1) {
        duplicateCount++;
        console.log(`- "${title}" found ${list.length} times:`);
        list.forEach(o => console.log(`  * ID: ${o._id} | Source: ${o.source} | URL: ${o.officialUrl}`));
      }
    });
    if (duplicateCount === 0) console.log('None found.');

    console.log(`\n⚠️ MISSING DEADLINES (${missingDeadlines.length}):`);
    missingDeadlines.forEach(o => console.log(`- ${o.title} (${o.source})`));

    // 3. Validation - Check for key programs like EEE
    const eee = opportunities.find(o => o.title.includes('ΕΕΕ') || o.title.includes('Εγγυημένου'));
    console.log(`\n🔍 KEY PROGRAM CHECK:`);
    console.log(`- Ελάχιστο Εγγυημένο Εισόδημα: ${eee ? '✅ FOUND' : '❌ MISSING'}`);

  } catch (error) {
    console.error('Error during production audit:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from Production DB');
  }
}

auditProduction();
