import { Queue } from "bullmq";
import { config } from "../config/env";
import Redis from "ioredis";

const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  // Required by BullMQ for blocking commands
  maxRetriesPerRequest: null,
});

export const ingestionQueue = new Queue("ingestion", { connection });
export const aggregationQueue = new Queue("aggregation", { connection });
export const verificationQueue = new Queue("verification", { connection });
export const matchingQueue = new Queue("matching", { connection });
