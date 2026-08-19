import { describe, it, expect } from 'vitest';
import { analyzeSentiment } from '@/utils/sentiment';

describe('analyzeSentiment', () => {
  it('classifies clearly positive English headlines', () => {
    expect(analyzeSentiment('Stocks surge to record high as profits beat forecasts')).toBe('positive');
    expect(analyzeSentiment('Samsung wins major AI chip contract, shares rally')).toBe('positive');
  });

  it('classifies clearly negative English headlines', () => {
    expect(analyzeSentiment('Markets crash as recession fears deepen')).toBe('negative');
    expect(analyzeSentiment('Tech giant announces mass layoffs after quarterly loss')).toBe('negative');
  });

  it('classifies Korean headlines in both directions', () => {
    expect(analyzeSentiment('코스피 급등…반도체 강세에 최고치 경신')).toBe('positive');
    expect(analyzeSentiment('수출 급락에 경기 침체 우려 확산')).toBe('negative');
  });

  it('returns neutral for factual headlines without loaded vocabulary', () => {
    expect(analyzeSentiment('Apple to hold developer conference in June')).toBe('neutral');
    expect(analyzeSentiment('정부, 내년 예산안 국회 제출')).toBe('neutral');
  });

  it('matches English words at boundaries only (no substring false hits)', () => {
    // 'win' inside 'winter', 'war' inside 'warm', 'ban' inside 'urban'
    expect(analyzeSentiment('Winter tourism in urban warm climates')).toBe('neutral');
    // 'fall' inside 'rainfall'
    expect(analyzeSentiment('Rainfall levels measured across the region')).toBe('neutral');
  });

  it('weighs strongly loaded words over mild opposite ones', () => {
    // crash(2) vs gain(1) → negative
    expect(analyzeSentiment('Bitcoin crash wipes out early gain')).toBe('negative');
  });

  it('balanced headlines fall back to neutral', () => {
    // rise(1) vs fall(1)
    expect(analyzeSentiment('Some stocks rise while others fall')).toBe('neutral');
  });
});
