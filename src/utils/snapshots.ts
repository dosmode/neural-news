export interface CoverageSnapshot {
  /** Unix ms when the snapshot was taken. */
  at: number;
  /** Signature of the active keyword set the counts were measured under. */
  setKey: string;
  /** Per-keyword article coverage at that moment. */
  counts: Record<string, number>;
}

export interface SnapshotOpts {
  minGapMs?: number;
  maxAgeMs?: number;
  cap?: number;
}

const DEFAULTS: Required<SnapshotOpts> = {
  minGapMs: 10 * 60 * 1000, // one snapshot per 10 minutes
  maxAgeMs: 7 * 24 * 3600 * 1000, // keep a week of history
  cap: 144,
};

/**
 * Append a coverage snapshot to the rolling history that powers the issue
 * time machine. Within the min gap the last entry is replaced (freshest wins
 * without inflating the timeline); entries older than maxAge or beyond the
 * cap are pruned.
 */
export function appendSnapshot(
  history: CoverageSnapshot[],
  snap: CoverageSnapshot,
  opts?: SnapshotOpts
): CoverageSnapshot[] {
  const { minGapMs, maxAgeMs, cap } = { ...DEFAULTS, ...opts };
  const prior = Array.isArray(history) ? history.filter((s) => s && typeof s.at === 'number') : [];
  const last = prior[prior.length - 1];
  const out =
    !last || snap.at - last.at >= minGapMs
      ? [...prior, snap]
      : [...prior.slice(0, -1), snap];
  return out.filter((s) => snap.at - s.at <= maxAgeMs).slice(-cap);
}

/** Human-readable short timestamp for the scrubber label (e.g. "8/14 21:30"). */
export function snapshotLabel(at: number): string {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}
