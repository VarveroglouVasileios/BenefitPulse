import mongoose from 'mongoose';
import { Opportunity } from '../models/opportunity.model';
import dotenv from 'dotenv';
import path from 'path';

// Load dev environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function analyzeOpportunities() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env.development');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const opportunities = await Opportunity.find({}).lean();
    console.log(`\nTotal opportunities found: ${opportunities.length}`);

    const now = new Date();
    
    let expiredCount = 0;
    let duplicateCount = 0;
    const titles = new Set<string>();
    const links = new Set<string>();

    const expiredList: any[] = [];
    const duplicateList: any[] = [];
    const validList: any[] = [];

    for (const opp of opportunities) {
      let isExpired = false;
      let isDuplicate = false;

      // Check for expiration
      if (opp.deadlineAt && new Date(opp.deadlineAt) < now) {
        isExpired = true;
        expiredCount++;
        expiredList.push(opp);
      }

      // Check for duplicates
      if (titles.has(opp.title) || (opp.officialUrl && links.has(opp.officialUrl))) {
        isDuplicate = true;
        duplicateCount++;
        duplicateList.push(opp);
      }

      titles.add(opp.title);
      if (opp.officialUrl) {
        links.add(opp.officialUrl);
      }

      if (!isExpired && !isDuplicate && opp.status === 'published') {
        validList.push(opp);
      }
    }

    console.log(`\n--- ANALYSIS REPORT ---`);
    console.log(`Expired opportunities: ${expiredCount}`);
    console.log(`Duplicate opportunities: ${duplicateCount}`);
    console.log(`Valid and Published opportunities: ${validList.length}`);

    if (expiredCount > 0) {
      console.log(`\n--- EXPIRED OPPORTUNITIES ---`);
      expiredList.forEach(opp => {
        console.log(`- [${opp.source}] ${opp.title} (Deadline: ${opp.deadlineAt})`);
      });
    }

    if (duplicateCount > 0) {
      console.log(`\n--- DUPLICATE OPPORTUNITIES ---`);
      duplicateList.forEach(opp => {
        console.log(`- [${opp.source}] ${opp.title} (URL: ${opp.officialUrl})`);
      });
    }

    console.log(`\n--- VALID OPPORTUNITIES ---`);
    validList.forEach(opp => {
      console.log(`- [${opp.source}] ${opp.title}`);
      console.log(`  URL: ${opp.officialUrl}`);
      console.log(`  Type: ${opp.type} | Deadline: ${opp.deadlineAt || 'None'}`);
    });

  } catch (error) {
    console.error('Error analyzing opportunities:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

analyzeOpportunities();
