/**
 * Ingestion Reporter - Observability & Reproducibility
 * 
 * Tracks metrics, samples, and generates reports for ingestion runs
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SkipSample {
  title: string;
  url: string;
  reason: string;
  snippetLen: number;
  parserUsed: string;
  detectedKind?: string;
  detectedStatus?: string;
  timestamp: string;
}

export interface SourceMetrics {
  sourceId: string;
  sourceName: string;
  extracted: number;
  kept: number;
  published: number;
  updated: number;
  skipped: Record<string, number>;
  skipSamples: Record<string, SkipSample[]>; // Samples per skip reason
  statusCounts: {
    open: number;
    upcoming: number;
    closed: number;
    archived: number;
    draft: number;
    rejected: number;
  };
  topSkipReasons: Array<{ reason: string; count: number }>; // Top 10 skip reasons
  errors: Array<{ message: string; timestamp: string }>;
  durationMs: number;
}

export interface TabExclusionStats {
  tab: string;
  totalItems: number;
  excludedItems: number;
  exclusionReasons: Record<string, number>; // e.g., "brokenLink": 5, "tender": 2
}

export interface IngestionReport {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  sources: SourceMetrics[];
  summary: {
    totalSources: number;
    successfulSources: number;
    failedSources: number;
    totalExtracted: number;
    totalKept: number;
    totalPublished: number;
    totalUpdated: number;
    totalSkipped: number;
    skipReasons: Record<string, number>;
    statusCounts: {
      open: number;
      upcoming: number;
      closed: number;
      archived: number;
      draft: number;
      rejected: number;
    };
  };
  tabExclusions: TabExclusionStats[]; // Exclusion stats per tab
  metrics: {
    topBlockedDomains: Array<{ domain: string; count: number; samples: SkipSample[] }>;
    topRejectedTitles: Array<{ title: string; count: number; url: string }>;
    topInvalidDates: Array<{ source: string; input: string; parser: string; count: number }>;
  };
  debugMode: boolean;
}

export class IngestionReporter {
  private runId: string;
  private startedAt: Date;
  private sources: Map<string, SourceMetrics> = new Map();
  private debugMode: boolean;
  private reportsDir: string;
  private rawDir: string;
  
  // Aggregated metrics
  private blockedDomains: Map<string, { count: number; samples: SkipSample[] }> = new Map();
  private rejectedTitles: Map<string, { title: string; count: number; url: string }> = new Map();
  private invalidDates: Map<string, { source: string; input: string; parser: string; count: number }> = new Map();
  
  // Status tracking per source
  private sourceStatusCounts: Map<string, {
    open: number;
    upcoming: number;
    closed: number;
    archived: number;
    draft: number;
    rejected: number;
  }> = new Map();

  constructor(debugMode: boolean = false) {
    this.runId = `ingestion-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
    this.startedAt = new Date();
    this.debugMode = debugMode;
    
    // Ensure reports directory exists
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.rawDir = path.join(this.reportsDir, 'raw');
    
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
    if (this.debugMode && !fs.existsSync(this.rawDir)) {
      fs.mkdirSync(this.rawDir, { recursive: true });
    }
  }

  /**
   * Initialize tracking for a source
   */
  initSource(sourceId: string, sourceName: string): void {
    this.sources.set(sourceId, {
      sourceId,
      sourceName,
      extracted: 0,
      kept: 0,
      published: 0,
      updated: 0,
      skipped: {},
      skipSamples: {},
      statusCounts: {
        open: 0,
        upcoming: 0,
        closed: 0,
        archived: 0,
        draft: 0,
        rejected: 0,
      },
      topSkipReasons: [],
      errors: [],
      durationMs: 0,
    });
    this.sourceStatusCounts.set(sourceId, {
      open: 0,
      upcoming: 0,
      closed: 0,
      archived: 0,
      draft: 0,
      rejected: 0,
    });
  }

  /**
   * Track extracted items count
   */
  trackExtracted(sourceId: string, count: number): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.extracted = count;
    }
  }

  /**
   * Track kept item (passed filters)
   */
  trackKept(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.kept++;
    }
  }

  /**
   * Track published opportunity with status
   */
  trackPublished(sourceId: string, status?: string, applicationStatus?: string): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.published++;
      
      // Track status counts
      const statusCounts = this.sourceStatusCounts.get(sourceId);
      if (statusCounts) {
        if (status === "rejected") {
          statusCounts.rejected++;
        } else if (status === "archived") {
          statusCounts.archived++;
        } else if (status === "draft") {
          statusCounts.draft++;
        } else if (applicationStatus === "open") {
          statusCounts.open++;
        } else if (applicationStatus === "upcoming") {
          statusCounts.upcoming++;
        } else if (applicationStatus === "closed") {
          statusCounts.closed++;
        }
      }
    }
  }

  /**
   * Track updated opportunity
   */
  trackUpdated(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.updated++;
    }
  }

  /**
   * Track skipped item with sample
   */
  trackSkipped(
    sourceId: string,
    reason: string,
    title: string,
    url: string,
    snippetLen: number,
    parserUsed: string,
    detectedKind?: string,
    detectedStatus?: string
  ): void {
    const source = this.sources.get(sourceId);
    if (!source) return;

    // Increment skip count
    source.skipped[reason] = (source.skipped[reason] || 0) + 1;

    // Add sample (max 10 per reason)
    if (!source.skipSamples[reason]) {
      source.skipSamples[reason] = [];
    }
    if (source.skipSamples[reason].length < 10) {
      source.skipSamples[reason].push({
        title,
        url,
        reason,
        snippetLen,
        parserUsed,
        detectedKind,
        detectedStatus,
        timestamp: new Date().toISOString(),
      });
    }

    // Track blocked domains
    if (reason === 'blockedByHeuristics') {
      try {
        const domain = new URL(url).hostname;
        if (!this.blockedDomains.has(domain)) {
          this.blockedDomains.set(domain, { count: 0, samples: [] });
        }
        const domainData = this.blockedDomains.get(domain)!;
        domainData.count++;
        if (domainData.samples.length < 10) {
          domainData.samples.push({
            title,
            url,
            reason,
            snippetLen,
            parserUsed,
            detectedKind,
            detectedStatus,
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // Invalid URL, skip
      }
    }

    // Track rejected titles (service_info)
    if (reason === 'rejected' && detectedKind === 'service_info') {
      const key = title.toLowerCase().substring(0, 100);
      if (!this.rejectedTitles.has(key)) {
        this.rejectedTitles.set(key, { title, count: 0, url });
      }
      this.rejectedTitles.get(key)!.count++;
    }
  }

  /**
   * Track invalid date parsing
   */
  trackInvalidDate(sourceId: string, sourceName: string, input: string, parser: string): void {
    const key = `${sourceName}:${input}`;
    if (!this.invalidDates.has(key)) {
      this.invalidDates.set(key, { source: sourceName, input, parser, count: 0 });
    }
    this.invalidDates.get(key)!.count++;
  }

  /**
   * Track error
   */
  trackError(sourceId: string, message: string): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.errors.push({
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Save raw response (debug mode only)
   */
  async saveRawResponse(sourceId: string, sourceName: string, contentType: string, data: string | Buffer): Promise<void> {
    if (!this.debugMode) return;

    const sourceDir = path.join(this.rawDir, sourceId);
    if (!fs.existsSync(sourceDir)) {
      fs.mkdirSync(sourceDir, { recursive: true });
    }

    const timestamp = Date.now();
    const ext = contentType.includes('json') ? 'json' : contentType.includes('xml') ? 'xml' : 'html';
    const filename = `${timestamp}.${ext}`;
    const filepath = path.join(sourceDir, filename);

    await fs.promises.writeFile(filepath, data);
  }

  /**
   * Set source duration
   */
  setSourceDuration(sourceId: string, durationMs: number): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.durationMs = durationMs;
    }
  }

  /**
   * Generate and save report
   */
  async generateReport(): Promise<string> {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - this.startedAt.getTime();

    // Aggregate skip reasons
    const skipReasons: Record<string, number> = {};
    let totalExtracted = 0;
    let totalKept = 0;
    let totalPublished = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let successfulSources = 0;
    let failedSources = 0;

    for (const source of this.sources.values()) {
      totalExtracted += source.extracted;
      totalKept += source.kept;
      totalPublished += source.published;
      totalUpdated += source.updated;
      
      for (const [reason, count] of Object.entries(source.skipped)) {
        skipReasons[reason] = (skipReasons[reason] || 0) + count;
        totalSkipped += count;
      }

      if (source.errors.length === 0 && source.extracted > 0) {
        successfulSources++;
      } else if (source.errors.length > 0) {
        failedSources++;
      }
    }

    // Top blocked domains (sorted by count)
    const topBlockedDomains = Array.from(this.blockedDomains.entries())
      .map(([domain, data]) => ({ domain, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Top rejected titles (sorted by count)
    const topRejectedTitles = Array.from(this.rejectedTitles.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Top invalid dates (sorted by count)
    const topInvalidDates = Array.from(this.invalidDates.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Calculate top skip reasons per source and aggregate status counts
    const totalStatusCounts = {
      open: 0,
      upcoming: 0,
      closed: 0,
      archived: 0,
      draft: 0,
      rejected: 0,
    };
    
    const sourcesArray = Array.from(this.sources.values());
    for (const source of sourcesArray) {
      // Update status counts from tracking
      const statusCounts = this.sourceStatusCounts.get(source.sourceId);
      if (statusCounts) {
        source.statusCounts = { ...statusCounts };
        totalStatusCounts.open += statusCounts.open;
        totalStatusCounts.upcoming += statusCounts.upcoming;
        totalStatusCounts.closed += statusCounts.closed;
        totalStatusCounts.archived += statusCounts.archived;
        totalStatusCounts.draft += statusCounts.draft;
        totalStatusCounts.rejected += statusCounts.rejected;
      }
      
      // Calculate top 10 skip reasons for this source
      source.topSkipReasons = Object.entries(source.skipped)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }

    // Calculate tab exclusion stats (this will be populated after ingestion completes)
    const tabExclusions: TabExclusionStats[] = [];

    const report: IngestionReport = {
      runId: this.runId,
      startedAt: this.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
      sources: sourcesArray,
      summary: {
        totalSources: this.sources.size,
        successfulSources,
        failedSources,
        totalExtracted,
        totalKept,
        totalPublished,
        totalUpdated,
        totalSkipped,
        skipReasons,
        statusCounts: totalStatusCounts,
      },
      tabExclusions,
      metrics: {
        topBlockedDomains,
        topRejectedTitles,
        topInvalidDates,
      },
      debugMode: this.debugMode,
    };

    // Save report
    const filename = `ingestion-report-${this.runId}.json`;
    const filepath = path.join(this.reportsDir, filename);
    await fs.promises.writeFile(filepath, JSON.stringify(report, null, 2));

    return filepath;
  }

  /**
   * Get current run ID
   */
  getRunId(): string {
    return this.runId;
  }
}

