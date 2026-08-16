import { slugify } from '@/utils/keywordUtils';

// Generic news-title noise that never makes a good related keyword.
const GENERIC = new Set([
  'news', 'says', 'said', 'report', 'reports', 'update', 'updates', 'today',
  'live', 'watch', 'video', 'breaking', 'exclusive', 'analysis', 'opinion',
  'review', 'guide', 'best', 'top', 'new', 'latest', 'week', 'year', 'day',
  'the', 'a', 'an', 'of', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'with',
  'after', 'before', 'amid', 'over', 'under', 'how', 'why', 'what', 'when',
  'is', 'are', 'was', 'will', 'has', 'have', 'its', 'his', 'her', 'their',
  'vs', 'via', 'per', 'according',
  // sentence-case listicle noise ("We Turn Down", "Your Attention", "5 Reasons")
  'we', 'you', 'your', 'our', 'my', 'it', 'this', 'that', 'these', 'those',
  'here', 'there', 'reasons', 'things', 'ways', 'should', 'could', 'would',
  'dont', "don't", 'do', 'not', 'no', 'yes', 'if', 'but', 'so', 'as', 'by',
  'from', 'into', 'about', 'more', 'less', 'just', 'still', 'now', 'then',
]);

/** Strip Google News' trailing " - Source Name" from a title. */
function stripSource(title: string): string {
  const i = title.lastIndexOf(' - ');
  return i > 10 ? title.slice(0, i) : title;
}

/**
 * Mine related keyword candidates from news titles for a given keyword:
 * capitalized word runs (proper-noun-ish, up to 3 words) in Latin text plus
 * frequent Korean tokens. A candidate must appear in at least `minCount`
 * distinct titles and must not overlap the source keyword itself.
 * Returns up to `max` labels, most frequent first.
 */
export function extractRelatedTerms(
  titles: string[],
  keywordLabel: string,
  max = 6,
  minCount = 2
): string[] {
  const selfTokens = new Set(
    slugify(keywordLabel)
      .split('-')
      .map((t) => t.replace(/s$/, ''))
      .filter(Boolean)
  );

  const counts = new Map<string, { label: string; count: number }>();
  const bump = (label: string, seen: Set<string>) => {
    // Domains ("GSMArena.com") are sources, not topics.
    if (/\.(com|net|org|co|io|kr)\b/i.test(label)) return;
    // A phrase that starts or ends with a generic word is a sentence
    // fragment, not a topic ("We Turn Down", "Buy Instead").
    const ws = label.split(/\s+/);
    if (GENERIC.has(ws[0].toLowerCase()) || GENERIC.has(ws[ws.length - 1].toLowerCase())) return;
    const slug = slugify(label);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    const overlapsSelf = slug
      .split('-')
      .some((t) => selfTokens.has(t.replace(/s$/, '')));
    if (overlapsSelf) return;
    const entry = counts.get(slug);
    if (entry) entry.count += 1;
    else counts.set(slug, { label, count: 1 });
  };

  for (const raw of titles) {
    const title = stripSource(raw);
    const seenInTitle = new Set<string>(); // count once per title
    // Capitalized runs (skip a run that starts the sentence-initial word only
    // if it's a single generic word — proper nouns usually repeat elsewhere).
    const runs = title.match(/(?:[A-Z][A-Za-z0-9&.']*)(?:\s+[A-Z][A-Za-z0-9&.']*){0,2}/g) ?? [];
    for (const run of runs) {
      const words = run.split(/\s+/);
      if (words.every((w) => GENERIC.has(w.toLowerCase()))) continue;
      const cleaned = run.replace(/[^A-Za-z0-9가-힣]/g, '');
      // ≥3 chars, or a 2-char all-caps acronym (AI, EV, SK …)
      if (cleaned.length < 3 && !/^[A-Z0-9]{2}$/.test(cleaned)) continue;
      bump(run, seenInTitle);
    }
    // Korean tokens (2+ chars)
    const koreans = title.match(/[가-힣]{2,}/g) ?? [];
    for (const k of koreans) {
      if (GENERIC.has(k)) continue;
      bump(k, seenInTitle);
    }
  }

  return Array.from(counts.values())
    .filter((e) => e.count >= minCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((e) => e.label);
}
