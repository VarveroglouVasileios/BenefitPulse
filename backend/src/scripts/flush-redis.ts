
import { getRedisClient } from "../utils/cache";

async function flushRedis() {
  const redis = getRedisClient();
  console.log("🧹 Flushing Redis cache for feeds...");
  
  try {
    const keys = await redis.keys("feed_*");
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✅ Deleted ${keys.length} feed cache keys.`);
    } else {
      console.log("ℹ️ No feed cache keys found.");
    }

    // Also clear trending and other potential caches
    const otherKeys = await redis.keys("trending_*");
    if (otherKeys.length > 0) {
      await redis.del(...otherKeys);
      console.log(`✅ Deleted ${otherKeys.length} trending cache keys.`);
    }

    console.log("✨ Cache cleared successfully!");
  } catch (error) {
    console.error("❌ Error flushing Redis:", error);
  } finally {
    process.exit(0);
  }
}

flushRedis().catch(console.error);
