/**
 * Progress Tracker Utility
 * 
 * Provides visual progress bars, ETA calculations, and structured
 * logging for long-running worker jobs.
 */

export interface ProgressOptions {
  label: string;
  total: number;
  barWidth?: number;       // Width of the progress bar in chars (default: 30)
  logEvery?: number;       // Log every N items (default: 1)
  showItems?: boolean;     // Show per-item logs (default: false)
}

export class ProgressTracker {
  private label: string;
  private total: number;
  private current: number = 0;
  private barWidth: number;
  private logEvery: number;
  private showItems: boolean;
  private startTime: number;
  private phaseStartTime: number;
  private itemTimes: number[] = [];   // Track last N item durations for ETA
  private maxItemTimeSamples = 20;

  constructor(options: ProgressOptions) {
    this.label = options.label;
    this.total = options.total;
    this.barWidth = options.barWidth ?? 30;
    this.logEvery = options.logEvery ?? 1;
    this.showItems = options.showItems ?? false;
    this.startTime = Date.now();
    this.phaseStartTime = Date.now();
  }

  /**
   * Build the visual progress bar string
   */
  private buildBar(current: number, total: number): string {
    if (total === 0) return `[${"░".repeat(this.barWidth)}] 0%`;

    const percent = Math.min(100, Math.round((current / total) * 100));
    const filled = Math.round((current / total) * this.barWidth);
    const empty = this.barWidth - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `[${bar}] ${percent}%`;
  }

  /**
   * Format duration in human-readable form
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Calculate estimated time remaining based on recent item durations
   */
  private getETA(): string {
    if (this.current === 0 || this.itemTimes.length === 0) return "calculating...";

    const remaining = this.total - this.current;
    if (remaining <= 0) return "0s";

    // Use average of recent item durations
    const avgMs =
      this.itemTimes.reduce((a, b) => a + b, 0) / this.itemTimes.length;
    const etaMs = avgMs * remaining;

    return ProgressTracker.formatDuration(etaMs);
  }

  /**
   * Get elapsed time since tracker started
   */
  getElapsed(): string {
    return ProgressTracker.formatDuration(Date.now() - this.startTime);
  }

  /**
   * Get elapsed ms since tracker started
   */
  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Log the start of the tracked operation
   */
  start(): void {
    this.startTime = Date.now();
    this.phaseStartTime = Date.now();
    console.log(
      `\n${"═".repeat(70)}`
    );
    console.log(
      `  🚀 ${this.label} — ${this.total} items to process`
    );
    console.log(
      `  ⏱️  Started at ${new Date().toLocaleTimeString("el-GR", { hour12: false })}`
    );
    console.log(`${"═".repeat(70)}`);
  }

  /**
   * Increment progress and optionally log a message
   */
  tick(itemLabel?: string): void {
    const itemStart = this.phaseStartTime;
    this.current++;
    const itemDuration = Date.now() - itemStart;
    this.phaseStartTime = Date.now();

    // Track item duration for ETA calculation
    this.itemTimes.push(itemDuration);
    if (this.itemTimes.length > this.maxItemTimeSamples) {
      this.itemTimes.shift();
    }

    const shouldLog =
      this.current === 1 ||
      this.current === this.total ||
      this.current % this.logEvery === 0;

    if (shouldLog) {
      const bar = this.buildBar(this.current, this.total);
      const eta = this.getETA();
      const elapsed = this.getElapsed();
      const counter = `(${this.current}/${this.total})`;

      let line = `  ${bar} ${counter} | ⏱️ ${elapsed} | ETA: ${eta}`;
      if (this.showItems && itemLabel) {
        // Truncate item label to keep logs readable
        const maxLabelLen = 45;
        const truncated =
          itemLabel.length > maxLabelLen
            ? itemLabel.substring(0, maxLabelLen - 3) + "..."
            : itemLabel;
        line += ` | ${truncated}`;
      }

      console.log(line);
    }
  }

  /**
   * Log a sub-step within an item (e.g., per-item progress within a source)
   */
  subProgress(current: number, total: number, label: string): void {
    if (total === 0) return;
    const bar = this.buildBar(current, total);
    const truncated =
      label.length > 40 ? label.substring(0, 37) + "..." : label;
    console.log(`     ${bar} (${current}/${total}) ${truncated}`);
  }

  /**
   * Log completion of the tracked operation with a final summary
   */
  finish(extraStats?: Record<string, string | number>): void {
    const totalMs = Date.now() - this.startTime;
    const bar = this.buildBar(this.total, this.total);

    console.log(
      `\n${"─".repeat(70)}`
    );
    console.log(
      `  ✅ ${this.label} — COMPLETED`
    );
    console.log(
      `  ${bar} (${this.total}/${this.total})`
    );
    console.log(
      `  ⏱️  Total time: ${ProgressTracker.formatDuration(totalMs)}`
    );
    if (this.total > 0) {
      const avgMs = totalMs / this.total;
      console.log(
        `  📊 Avg per item: ${ProgressTracker.formatDuration(avgMs)}`
      );
    }
    if (extraStats) {
      for (const [key, value] of Object.entries(extraStats)) {
        console.log(`  📊 ${key}: ${value}`);
      }
    }
    console.log(
      `  🏁 Finished at ${new Date().toLocaleTimeString("el-GR", { hour12: false })}`
    );
    console.log(`${"─".repeat(70)}\n`);
  }
}

/**
 * Print a clear pipeline phase header
 */
export function logPhaseStart(phase: string, icon: string = "📦"): void {
  console.log(`\n${"━".repeat(70)}`);
  console.log(`  ${icon} PHASE: ${phase}`);
  console.log(`${"━".repeat(70)}`);
}

/**
 * Print a pipeline-level summary of all phases
 */
export function logPipelineSummary(
  phases: Array<{ name: string; durationMs: number; details?: string }>
): void {
  const totalMs = phases.reduce((sum, p) => sum + p.durationMs, 0);

  console.log(`\n${"═".repeat(70)}`);
  console.log(`  📊 WORKER PIPELINE SUMMARY`);
  console.log(`${"═".repeat(70)}`);

  for (const phase of phases) {
    const pct =
      totalMs > 0
        ? Math.round((phase.durationMs / totalMs) * 100)
        : 0;
    const dur = ProgressTracker.formatDuration(phase.durationMs);
    const details = phase.details ? ` — ${phase.details}` : "";
    console.log(`  • ${phase.name}: ${dur} (${pct}%)${details}`);
  }

  console.log(`${"─".repeat(70)}`);
  console.log(
    `  ⏱️  Total pipeline time: ${ProgressTracker.formatDuration(totalMs)}`
  );
  console.log(`${"═".repeat(70)}\n`);
}
