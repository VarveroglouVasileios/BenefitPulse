import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

async function resetBadData() {
  await connectMongo();

  const garbageTitleRegex = new RegExp(
    [
      "Πολιτική",
      "Πολιτικη",
      "Δήλωση",
      "Δηλωση",
      "Συχνές",
      "Συχνες",
      "Στατιστικά",
      "Στατιστικα",
      "Κατάλογος",
      "Καταλογος",
      "Δελτία",
      "Δελτια",
      "Ηλεκτρονικές Υπηρεσίες",
      "Ηλεκτρονικες Υπηρεσιες",
      "Κώδικας",
      "Κωδικας",
      "Επικοινωνία",
      "Επικοινωνια",
      "Site map",
      "Sitemap",
      "Cookies",
      "Privacy",
      "Terms",
    ].join("|"),
    "i"
  );

  const genericTitleRegex = new RegExp(
    "^(gov\\.gr|vouchers\\.gov\\.gr|υπουργείο|υπουργειο)\\b",
    "i"
  );

  const garbageUrlRegex = new RegExp(
    [
      "privacy",
      "cookies",
      "terms",
      "politiki",
      "policy",
      "dilosi",
      "statement",
      "faq",
      "sitemap",
      "site-map",
      "contact",
      "epikoinonia",
      "stats",
      "statistika",
      "catalog",
      "katologos",
      "kodikas",
      "code-of-conduct",
    ].join("|"),
    "i"
  );

  const filter: any = {
    $or: [
      { kind: "garbage" },
      { kind: "service_page" },
      { title: garbageTitleRegex },
      { title: genericTitleRegex },
      { officialUrl: garbageUrlRegex },
    ],
  };

  const result = await Opportunity.updateMany(filter, {
    $set: { kind: "service_info" },
  });

  console.log(
    `✅ Marked ${result.modifiedCount ?? 0} opportunities as kind="garbage"`
  );
}

export default resetBadData;


