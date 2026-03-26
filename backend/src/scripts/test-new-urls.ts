import axios from "axios";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

async function testUrl(url: string) {
  console.log(`\nTesting: ${url}`);
  try {
    const res = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 10000 });
    console.log(`✅ Status: ${res.status}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);
    console.log(`   Length: ${res.data.length} chars`);
    return true;
  } catch (err: any) {
    console.log(`❌ Error: ${err.response?.status || err.message}`);
    return false;
  }
}

async function main() {
  // Test Diavgeia RSS variations
  await testUrl("https://diavgeia.gov.gr/luminapi/api/feed/rss?q=q%3A%22%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1%22");
  await testUrl("https://diavgeia.gov.gr/luminapi/api/feed/rss?q=%CE%B5%CF%80%CE%AF%CE%B4%CE%BF%CE%BC%CE%B1");
  
  // Test Alieia.gr
  await testUrl("https://alieia.gr/feed/");
  await testUrl("https://alieia.gr/proskliseis/feed/");
  
  // Test Antagonistikotita again with more time
  await testUrl("https://www.antagonistikotita.gr/feed/");
}

main();
