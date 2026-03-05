// Polyfill for Node 16 (undici expects Blob/ReadableStream). Remove on Node 18+.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Blob } = require("buffer");
if (!(global as any).Blob) {
  (global as any).Blob = Blob;
}

// Minimal File polyfill using Blob
if (!(global as any).File) {
  class PolyfillFile extends Blob {
    name: string;
    lastModified: number;
    constructor(parts: any[], name: string, options: any = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  }
  (global as any).File = PolyfillFile;
}

// Minimal DOMException polyfill
if (!(global as any).DOMException) {
  class PolyfillDOMException extends Error {
    name: string;
    constructor(message = "", name = "DOMException") {
      super(message);
      this.name = name;
    }
  }
  (global as any).DOMException = PolyfillDOMException;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("web-streams-polyfill/polyfill");

import { ingestionQueue } from "../jobs/queues";

async function main() {
  console.log("🚀 Triggering ingestion worker...");
  
  await ingestionQueue.add("process-all-sources", {}, {
    removeOnComplete: true,
    removeOnFail: true
  });
  
  console.log("✅ Job added to queue! Watch the worker logs.");
  process.exit(0);
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export default main;
