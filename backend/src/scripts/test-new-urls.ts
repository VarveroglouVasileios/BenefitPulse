
import axios from "axios";
import * as cheerio from "cheerio";

async function testUrls() {
  const urls = [
    "https://www.dypa.gov.gr/spitimou",
    "https://www.espa.gr/el/Pages/Proclamations.aspx"
  ];

  for (const url of urls) {
    try {
      console.log(`\nTesting: ${url}`);
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
      });
      console.log(`Status: ${response.status}`);
      const $ = cheerio.load(response.data);
      const title = $("title").text().trim();
      console.log(`Title: ${title}`);
      console.log(`Length: ${response.data.length} chars`);
      
      if (url.includes("spitimou")) {
        const text = $("body").text().toLowerCase();
        if (text.includes("σπίτι μου ιι") || text.includes("σπίτι μου 2")) {
          console.log("✅ Found mention of 'Σπίτι μου II'");
        } else {
          console.log("❌ NO mention of 'Σπίτι μου II' found on this page.");
        }
      }
    } catch (error: any) {
      console.error(`❌ Error testing ${url}: ${error.message}`);
    }
  }
}

testUrls();
