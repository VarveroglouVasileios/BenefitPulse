import mongoose from 'mongoose';
import { Opportunity } from '../models/opportunity.model';
import { RawItem } from '../models/rawItem.model';
import { searchDiavgeia, crossReferenceAsepWithDiavgeia } from '../modules/ingestion/diavgeia';
import { extractOpportunity } from '../modules/ingestion/extractor';
import dotenv from 'dotenv';
import path from 'path';

// Clear existing environment variables to avoid pollution
delete process.env.MONGODB_URI;
delete process.env.NODE_ENV;

// Load production environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env.production'), override: true });

async function fixProduction() {
  try {
    const baseUri = process.env.MONGODB_URI;
    if (!baseUri) throw new Error('MONGODB_URI not found in .env.production');
    
    // Explicitly target the 'benefitpulse' database
    let prodUri = baseUri;
    if (prodUri.endsWith('/')) {
      prodUri += 'benefitpulse';
    } else if (!prodUri.includes('/', 15)) { // Check if there's a slash after the protocol
      prodUri += '/benefitpulse';
    } else {
      // If it already has a database, replace it
      const lastSlash = prodUri.lastIndexOf('/');
      prodUri = prodUri.substring(0, lastSlash + 1) + 'benefitpulse';
    }
    
    console.log('🚀 Connecting to Production DB for repairs...');
    // Log URI without password for safety
    console.log(`📡 URI: \${prodUri.replace(/:([^@]+)@/, ':****@')}`);
    
    await mongoose.connect(prodUri);
    console.log('✅ Connected');

    const published = await Opportunity.find({ status: 'published', deletedAt: null });
    console.log(`\n🧐 Analyzing \${published.length} published opportunities...`);

    for (const opp of published) {
      console.log(`\nProcessing: "\${opp.title}"`);
      
      let externalText = "";
      let externalUrl = "";

      // 1. Try to get more info from Diavgeia
      const diavgeiaMatch = await crossReferenceAsepWithDiavgeia(opp.title);
      if (diavgeiaMatch) {
        console.log(`   ✅ Diavgeia Match found: \${diavgeiaMatch.url}`);
        externalText = diavgeiaMatch.text;
        externalUrl = diavgeiaMatch.url;
      } else if (opp.title.length > 20) {
        // Try generic search for programs
        const searchTitle = opp.title.replace(/[«»"]/g, '').substring(0, 50).trim();
        const genericMatch = await searchDiavgeia(`subject:"\${searchTitle}"`);
        if (genericMatch) {
           console.log(`   ✅ Generic Diavgeia match: \${genericMatch.url}`);
           externalText = genericMatch.text;
           externalUrl = genericMatch.url;
        }
      }

      // 2. Run AI Extraction with the new full text
      console.log(`   🤖 Re-extracting with AI...`);
      const extraction = await extractOpportunity(opp.title + "\n\n" + (externalText || opp.summary));
      
      let updated = false;

      if (extraction.deadlineAt) {
        console.log(`   📅 New Deadline: \${extraction.deadlineAt}`);
        opp.deadlineAt = extraction.deadlineAt;
        opp.applicationEndAt = extraction.deadlineAt;
        updated = true;
        
        if (new Date(extraction.deadlineAt) < new Date()) {
          console.log(`   🔒 Deadline passed -> ARCHIVING`);
          opp.status = 'archived';
          opp.applicationStatus = 'closed';
        }
      }

      if (extraction.summary && extraction.summary.length > 50) {
        opp.summary = extraction.summary;
        updated = true;
      }

      if (extraction.isIrrelevant) {
        console.log(`   ⛔ AI marked as irrelevant news -> ARCHIVING`);
        opp.status = 'archived';
        updated = true;
      }

      if (updated) {
        await opp.save();
        console.log(`   💾 Saved changes`);
      } else {
        console.log(`   ℹ️  No changes needed`);
      }
    }

    // 3. Specifically look for EEE
    console.log(`\n🔍 Searching for missing "Ελάχιστο Εγγυημένο Εισόδημα" in Diavgeia...`);
    const eeeDiavgeia = await searchDiavgeia('subject:"Ελάχιστο Εγγυημένο Εισόδημα"');
    if (eeeDiavgeia) {
       const existing = await Opportunity.findOne({ title: /Ελάχιστο Εγγυημένο Εισόδημα/i });
       if (!existing) {
          console.log(`   ✨ Found EEE in Diavgeia! Adding as new opportunity...`);
          const ext = await extractOpportunity(eeeDiavgeia.text);
          await Opportunity.create({
            type: ext.type || 'subsidy',
            kind: 'benefit',
            title: "Πρόγραμμα Ελάχιστου Εγγυημένου Εισοδήματος (ΕΕΕ)",
            summary: ext.summary,
            officialUrl: "https://keaprogram.gr/",
            source: "Διαύγεια (Διασταύρωση)",
            publishedAt: new Date(),
            announcedAt: new Date(),
            deadlineAt: ext.deadlineAt,
            applicationStatus: 'open',
            status: 'published',
            confidence: 0.9,
            tags: ext.tags || ['eee', 'subsidy', 'poverty_relief']
          });
          console.log(`   ✅ EEE Program Added!`);
       } else {
          console.log(`   ℹ️  EEE already exists in DB.`);
       }
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🏁 Done.');
  }
}

fixProduction();
