import mongoose from 'mongoose';
import { Opportunity } from '../models/opportunity.model';
import { RawItem } from '../models/rawItem.model';
import { crossReferenceAsepWithDiavgeia } from '../modules/ingestion/diavgeia';
import { extractOpportunity } from '../modules/ingestion/extractor';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function fixAsep() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const opps = await Opportunity.find({ 
      title: { $regex: '1Κ/2026|2Κ/2026', $options: 'i' },
      status: 'published'
    });

    console.log(`Found \${opps.length} ASEP opportunities to fix`);

    for (const opp of opps) {
      console.log(`\nFixing: \${opp.title}`);
      
      // 1. Cross-reference with Diavgeia
      const diavgeia = await crossReferenceAsepWithDiavgeia(opp.title);
      if (diavgeia) {
        console.log(`✅ Found Diavgeia doc: \${diavgeia.url}`);
        
        // 2. Re-extract with AI using the full text
        const extraction = await extractOpportunity(opp.title + "\n\n" + diavgeia.text);
        
        if (extraction.deadlineAt) {
          console.log(`📅 Found Deadline: \${extraction.deadlineAt}`);
          opp.deadlineAt = extraction.deadlineAt;
          opp.applicationEndAt = extraction.deadlineAt;
          
          if (new Date(extraction.deadlineAt) < new Date()) {
            console.log(`🔒 Deadline passed, archiving...`);
            opp.status = 'archived';
            opp.applicationStatus = 'closed';
          }
          
          opp.summary = extraction.summary;
          await opp.save();
          console.log(`✅ Updated \${opp.title}`);
        } else {
          console.log(`⚠️ AI could not find deadline even in Diavgeia doc`);
        }
      } else {
        console.log(`❌ No Diavgeia doc found for \${opp.title}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixAsep();
