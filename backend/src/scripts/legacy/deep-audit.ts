import mongoose from 'mongoose';
import { Opportunity } from '../models/opportunity.model';
import dotenv from 'dotenv';
import path from 'path';

async function deepAudit() {
  try {
    // 1. Production Data
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
    
    const prodAll = await Opportunity.find({ deletedAt: null }).lean();
    const prodPublished = prodAll.filter(o => o.status === 'published');
    const prodArchived = prodAll.filter(o => o.status === 'archived');
    const prodDrafts = prodAll.filter(o => o.status === 'draft');
    
    console.log(`\n--- PRODUCTION STATUS ---`);
    console.log(`Published: ${prodPublished.length}`);
    console.log(`Archived: ${prodArchived.length}`);
    console.log(`Drafts: ${prodDrafts.length}`);
    
    await mongoose.disconnect();

    // 2. Local Data
    delete process.env.MONGODB_URI;
    dotenv.config({ path: path.resolve(__dirname, '../../.env.development'), override: true });
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('\n📡 Connected to Local DB');
    
    const localPublished = await Opportunity.find({ status: 'published', deletedAt: null }).lean();
    console.log(`Published: ${localPublished.length}`);
    
    // 3. Comparison
    console.log('\n--- CROSS-ENVIRONMENT COMPARISON ---');
    const prodPublishedTitles = new Set(prodPublished.map(o => o.title.toLowerCase().trim()));
    const prodArchivedTitles = new Set(prodArchived.map(o => o.title.toLowerCase().trim()));
    
    const onlyLocal = localPublished.filter(o => !prodPublishedTitles.has(o.title.toLowerCase().trim()));
    
    console.log(`\n🆕 ITEMS IN LOCAL BUT NOT PUBLISHED IN PROD (${onlyLocal.length}):`);
    for (const o of onlyLocal) {
      const inArchive = prodArchivedTitles.has(o.title.toLowerCase().trim());
      console.log(`- [${o.source}] ${o.title} -> ${inArchive ? '📦 ARCHIVED IN PROD' : '❌ COMPLETELY MISSING IN PROD'}`);
    }

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

deepAudit();
