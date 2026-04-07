
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

async function lockCoreData() {
  await connectMongo();
  console.log("🔒 Locking core opportunities from CorrectData.txt...");

  const coreUrls = [
    "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/bebaiose-epileximotetas-sto-programma-spiti-mou-ii",
    "https://vouchers.gov.gr/fuelpass",
    "https://vouchers.gov.gr/youthpass",
    "https://opeka.gr/oikogeneia/epidoma-paidiou-a21",
    "https://opeka.gr/oikogeneia/epidoma-gennisis/ilektronikes-ypiresies/",
    "https://opeka.gr/stegasi/epidoma-stegasis/ilektronikes-ypiresies/",
    "https://opeka.gr/elachisto-engyimeno-eisodima/ilektronikes-ypiresies/",
    "https://opeka.gr/anasfalistoi-yperilikes/epidoma-koinonikis-allilengyis-anasfaliston-yperilikon/ilektronikes-ypiresies/",
    "https://opeka.gr/atoma-me-anapiria/anapirika-epidomata/ilektronikes-ypiresies/",
    "https://www.dypa.gov.gr/epidoma-anergias",
    "https://www.gov.gr/ipiresies/ergasia-kai-asphalia/asphaliseis/epitheoresi-ergasias-epidotisi-anergias/epidoma-makrokhronion-anergon",
    "https://www.espa.gr/el/Pages/ProclamationsFS.aspx?item=7179",
    "https://www.espa.gr/el/Pages/ProclamationsFS.aspx?item=7161",
    "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/Smart-Readiness-application",
    "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/kouponi-sundesimotetas-gigabit-gigabit-connectivity-voucher-scheme",
    "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/anakuklono-allazo-suskeue",
    "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/summetokhe-opheloumenon-ste-drase-ntantades-tes-geitonias",
    "https://www.gov.gr/ipiresies/periousia-kai-phorologia/epidoteseis-politon/programma-eniskhuses-amea-prosbasimoteta-kat-oikon"
  ];

  // Pattern for ASEP proclamations
  const asepPattern = /\b\d+[Α-ΩΆ-ΏA-Z]+\/\d{4}\b/i;

  const res = await Opportunity.updateMany(
    { 
      $or: [
        { officialUrl: { $in: coreUrls } },
        { title: { $regex: asepPattern } }
      ],
      status: "published"
    },
    { $set: { isLocked: true } }
  );

  console.log(`✅ Locked ${res.modifiedCount} opportunities.`);
  process.exit(0);
}

lockCoreData().catch(console.error);
