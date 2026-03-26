import mongoose from 'mongoose';
import { Opportunity } from '../models/opportunity.model';
import dotenv from 'dotenv';
import path from 'path';

async function compareDatabases() {
  const results: any = { local: {}, production: {} };

  try {
    // 1. Check Local DB
    dotenv.config({ path: path.resolve(__dirname, '../../.env.development'), override: true });
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('📡 Connected to Local DB');
    
    const localOpps = await Opportunity.find({ status: 'published', deletedAt: null }).lean();
    results.local.total = localOpps.length;
    results.local.sources = countBySource(localOpps);
    await mongoose.disconnect();

    // 2. Check Production DB
    // Clear env to be sure
    delete process.env.MONGODB_URI;
    dotenv.config({ path: path.resolve(__dirname, '../../../.env.production'), override: true });
    
    let prodUri = process.env.MONGODB_URI as string;
    if (prodUri.endsWith('/')) prodUri += 'benefitpulse';
    else if (!prodUri.includes('/', 15)) prodUri += '/benefitpulse';
    else {
      const lastSlash = prodUri.lastIndexOf('/');
      prodUri = prodUri.substring(0, lastSlash + 1) + 'benefitpulse';
    }

    await mongoose.connect(prodUri);
    console.log('📡 Connected to Production DB');
    
    const prodOpps = await Opportunity.find({ status: 'published', deletedAt: null }).lean();
    results.production.total = prodOpps.length;
    results.production.sources = countBySource(prodOpps);
    await mongoose.disconnect();

    // 3. Report
    console.log('\n=== DATABASE COMPARISON REPORT ===');
    console.log(`TOTAL PUBLISHED: Local (${results.local.total}) vs Production (${results.production.total})`);
    
    console.log('\n--- DISCREPANCIES BY SOURCE ---');
    const allSources = new Set([...Object.keys(results.local.sources), ...Object.keys(results.production.sources)]);
    
    allSources.forEach(source => {
      const lCount = results.local.sources[source] || 0;
      const pCount = results.production.sources[source] || 0;
      if (lCount !== pCount) {
        console.log(`- ${source}: Local (${lCount}) | Production (${pCount}) -> Diff: ${lCount - pCount}`);
      }
    });

    // Detailed look at extra items in local
    const prodTitles = new Set(prodOpps.map(o => o.title));
    
    const onlyLocal = localOpps.filter(o => !prodTitles.has(o.title));
    console.log(`\n🆕 ITEMS ONLY IN LOCAL (${onlyLocal.length}):`);
    onlyLocal.slice(0, 20).forEach(o => console.log(`- [${o.source}] ${o.title}`));
    if (onlyLocal.length > 20) console.log('... and more');

  } catch (error) {
    console.error('Comparison failed:', error);
  }
}

function countBySource(opps: any[]) {
  const counts: any = {};
  opps.forEach(o => {
    counts[o.source] = (counts[o.source] || 0) + 1;
  });
  return counts;
}

compareDatabases();
