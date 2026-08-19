// Lexicon-based sentiment for news TITLES (English + Korean). Replaces the
// old hash placeholder that assigned sentiment at random — with this, the
// sentiment clusters, dot colors, and the Sentiment filter weight reflect
// what headlines actually say. Weights: 2 = strongly loaded word, 1 = mild.

const POSITIVE: Record<string, number> = {
  // English — markets & general news
  surge: 2, surges: 2, soar: 2, soars: 2, rally: 2, rallies: 2, boom: 2,
  breakthrough: 2, 'record high': 2, wins: 2, win: 1, victory: 2,
  growth: 1, gain: 1, gains: 1, boost: 1, boosts: 1, jump: 1, jumps: 1,
  rise: 1, rises: 1, rising: 1, climb: 1, climbs: 1, beat: 1, beats: 1,
  strong: 1, stronger: 1, success: 1, successful: 1, profit: 1, profits: 1,
  recovery: 1, recover: 1, rebound: 2, upgrade: 1, upgraded: 1,
  optimism: 2, optimistic: 2, hope: 1, hopeful: 1, praise: 1, praised: 1,
  approve: 1, approves: 1, approved: 1, expand: 1, expands: 1, expansion: 1,
  hire: 1, hiring: 1, innovation: 1, thrive: 2, thrives: 2, improve: 1,
  improves: 1, improved: 1, celebrate: 1, celebrates: 1, milestone: 1,
  award: 1, awarded: 1, 'all-time high': 2, outperform: 2, outperforms: 2,
  // Korean
  상승: 1, 급등: 2, 반등: 2, 호재: 2, 호조: 2, 성장: 1, 돌파: 1, 최고치: 2,
  신기록: 2, 흑자: 2, 개선: 1, 회복: 1, 성공: 1, 수상: 1, 확대: 1, 증가: 1,
  기대: 1, 낙관: 2, 호평: 1, 승인: 1, 혁신: 1, 출시: 1, 유치: 1, 채용: 1,
  강세: 2, 최고가: 2,
};

const NEGATIVE: Record<string, number> = {
  // English
  crash: 2, crashes: 2, plunge: 2, plunges: 2, plummet: 2, plummets: 2,
  collapse: 2, collapses: 2, crisis: 2, fear: 1, fears: 1, panic: 2,
  fall: 1, falls: 1, falling: 1, drop: 1, drops: 1, decline: 1, declines: 1,
  loss: 1, losses: 1, lose: 1, loses: 1, slump: 2, slumps: 2, tumble: 2,
  tumbles: 2, sink: 1, sinks: 1, risk: 1, risks: 1, warning: 1, warn: 1,
  warns: 1, threat: 1, threatens: 1, war: 2, attack: 2, attacks: 2,
  death: 2, deaths: 2, dead: 2, dies: 2, killed: 2, kill: 2, kills: 2,
  layoff: 2, layoffs: 2, 'job cuts': 2, cut: 1, cuts: 1, fraud: 2,
  lawsuit: 1, sue: 1, sues: 1, sued: 1, ban: 1, bans: 1, banned: 1,
  // NOTE: ambiguous words are deliberately absent — 'default' (settings vs
  // debt), 'fine' (adjective vs penalty), 'probe' (spacecraft vs inquiry).
  fail: 2, fails: 2, failure: 2, weak: 1, weaker: 1, recession: 2,
  downturn: 2, downgrade: 1, downgraded: 1, scandal: 2,
  investigation: 1, fined: 1, shortage: 1, disaster: 2, crackdown: 1,
  bankruptcy: 2, bankrupt: 2, tariff: 1, tariffs: 1,
  // Korean
  하락: 1, 급락: 2, 폭락: 2, 악재: 2, 위기: 2, 손실: 1, 적자: 2, 우려: 1,
  충격: 2, 사망: 2, 전쟁: 2, 공격: 2, 규제: 1, 경고: 1, 파산: 2, 부진: 1,
  감소: 1, 축소: 1, 해고: 2, 사기: 2, 소송: 1, 금지: 1, 실패: 2, 약세: 2,
  침체: 2, 불황: 2, 스캔들: 2, 수사: 1, 벌금: 1, 논란: 1, 부족: 1, 재난: 2,
  최저치: 2, 붕괴: 2,
};

const isLatin = (w: string) => /^[a-z]/.test(w);

function scoreSide(title: string, lower: string, lexicon: Record<string, number>): number {
  let score = 0;
  for (const [word, weight] of Object.entries(lexicon)) {
    if (isLatin(word)) {
      // whole-word / whole-phrase match so "war" doesn't fire inside "warm"
      if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower)) {
        score += weight;
      }
    } else if (title.includes(word)) {
      // Korean is agglutinative — substring match ("급등세" contains "급등")
      score += weight;
    }
  }
  return score;
}

/**
 * Classify a headline. Positive/negative when one side outweighs the other;
 * neutral when balanced or no loaded vocabulary appears.
 */
export function analyzeSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  if (!title) return 'neutral';
  const lower = title.toLowerCase();
  const pos = scoreSide(title, lower, POSITIVE);
  const neg = scoreSide(title, lower, NEGATIVE);
  if (pos - neg >= 1) return 'positive';
  if (neg - pos >= 1) return 'negative';
  return 'neutral';
}
