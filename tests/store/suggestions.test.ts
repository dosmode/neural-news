import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';

function resetStore() {
  useStore.setState({
    keywords: [],
    activeKeywords: new Set<string>(),
    suggestions: [],
    hydrated: false,
  });
}

describe('addSuggestions', () => {
  beforeEach(resetStore);

  it('adds suggestions to state for a given source keyword', () => {
    useStore.getState().addSuggestions('ai', ['Machine Learning', 'OpenAI']);
    const { suggestions } = useStore.getState();
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].sourceKeywordId).toBe('ai');
    expect(suggestions[0].isDismissed).toBe(false);
  });

  it('deduplicates suggestions with same label for same source', () => {
    useStore.getState().addSuggestions('ai', ['Machine Learning']);
    useStore.getState().addSuggestions('ai', ['Machine Learning', 'OpenAI']);
    const { suggestions } = useStore.getState();
    const ml = suggestions.filter(s => s.label === 'Machine Learning');
    expect(ml).toHaveLength(1);
  });
});

describe('acceptSuggestion', () => {
  beforeEach(resetStore);

  it('promotes suggestion to keyword with correct parentId', () => {
    useStore.getState().addKeyword('AI');
    useStore.getState().addSuggestions('ai', ['OpenAI']);
    const suggestionId = useStore.getState().suggestions[0].id;

    useStore.getState().acceptSuggestion(suggestionId);

    const { keywords, suggestions } = useStore.getState();
    const promoted = keywords.find(k => k.id === 'openai');
    expect(promoted).toBeDefined();
    expect(promoted?.parentId).toBe('ai');
    expect(suggestions.find(s => s.id === suggestionId)).toBeUndefined();
  });

  it('returns ok: false when keyword limit is reached', () => {
    // Fill up to MAX_KEYWORDS
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    labels.forEach(l => useStore.getState().addKeyword(l));

    useStore.getState().addSuggestions('a', ['NewSuggestion']);
    const suggestionId = useStore.getState().suggestions[0].id;
    const result = useStore.getState().acceptSuggestion(suggestionId);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('limit');
  });

  it('adds promoted keyword to activeKeywords', () => {
    useStore.getState().addKeyword('AI');
    useStore.getState().addSuggestions('ai', ['Nvidia']);
    const suggestionId = useStore.getState().suggestions[0].id;

    useStore.getState().acceptSuggestion(suggestionId);

    const { activeKeywords } = useStore.getState();
    expect(activeKeywords.has('nvidia')).toBe(true);
  });
});

describe('dismissSuggestion', () => {
  beforeEach(resetStore);

  it('sets isDismissed to true without removing the entry', () => {
    useStore.getState().addSuggestions('ai', ['OpenAI']);
    const suggestionId = useStore.getState().suggestions[0].id;

    useStore.getState().dismissSuggestion(suggestionId);

    const { suggestions } = useStore.getState();
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].isDismissed).toBe(true);
  });
});

describe('removeKeyword cascade', () => {
  beforeEach(resetStore);

  it('removes direct suggestions when keyword is removed', () => {
    useStore.getState().addKeyword('Bitcoin');
    useStore.getState().addSuggestions('bitcoin', ['Ethereum', 'Crypto']);

    useStore.getState().removeKeyword('bitcoin');

    const { suggestions } = useStore.getState();
    expect(suggestions).toHaveLength(0);
  });

  it('cascade-removes child keyword and its suggestions', () => {
    // Add Bitcoin, accept Ethereum as child
    useStore.getState().addKeyword('Bitcoin');
    useStore.getState().addSuggestions('bitcoin', ['Ethereum']);
    const ethSugId = useStore.getState().suggestions[0].id;
    useStore.getState().acceptSuggestion(ethSugId);

    // Add suggestions for the child keyword Ethereum
    useStore.getState().addSuggestions('ethereum', ['DeFi', 'NFT']);

    // Remove the root keyword
    useStore.getState().removeKeyword('bitcoin');

    const { keywords, suggestions } = useStore.getState();
    expect(keywords.find(k => k.id === 'bitcoin')).toBeUndefined();
    expect(keywords.find(k => k.id === 'ethereum')).toBeUndefined();
    expect(suggestions).toHaveLength(0);
  });
});
