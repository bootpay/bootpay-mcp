import type { DocMeta, SearchResult } from '../types.js';

/**
 * 간단한 in-memory 텍스트 검색.
 * 121개 문서(~867KB)라 벡터 DB 불필요.
 */
export function searchDocs(
  docs: DocMeta[],
  query: string,
  options: { category?: string; limit?: number } = {}
): SearchResult[] {
  const { category, limit = 5 } = options;
  const queryLower = query.toLowerCase();
  const queryTokens = queryLower.split(/\s+/).filter(Boolean);

  let candidates = docs;
  if (category) {
    candidates = candidates.filter(d => d.category === category);
  }

  const scored: SearchResult[] = candidates.map(doc => {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const descLower = doc.description.toLowerCase();
    const pathLower = doc.path.toLowerCase();

    // 제목 완전 매칭
    if (titleLower === queryLower) score += 100;

    // 토큰별 매칭
    for (const token of queryTokens) {
      if (titleLower.includes(token)) score += 10;
      if (descLower.includes(token)) score += 5;
      if (pathLower.includes(token)) score += 3;
    }

    // 연속 매칭 보너스
    if (titleLower.includes(queryLower)) score += 20;
    if (descLower.includes(queryLower)) score += 10;

    const snippet = doc.description.length > 200
      ? doc.description.slice(0, 200) + '...'
      : doc.description;

    return { ...doc, snippet, score };
  });

  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * CS 응대 가이드에서 섹션 검색
 */
export function searchCsGuide(content: string, section?: string): string {
  if (!section) return content;

  const sectionLower = section.toLowerCase();
  const lines = content.split('\n');
  const sections: { heading: string; start: number; end: number }[] = [];

  // H2, H3 기준으로 섹션 분리
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#{2,3}\s/)) {
      if (sections.length > 0) {
        sections[sections.length - 1].end = i;
      }
      sections.push({ heading: lines[i], start: i, end: lines.length });
    }
  }

  // 매칭되는 섹션 찾기
  const matched = sections.filter(s =>
    s.heading.toLowerCase().includes(sectionLower)
  );

  if (matched.length === 0) {
    // 본문에서 키워드 포함하는 섹션
    const bodyMatched = sections.filter(s => {
      const body = lines.slice(s.start, s.end).join('\n').toLowerCase();
      return body.includes(sectionLower);
    });
    if (bodyMatched.length === 0) return `"${section}"에 해당하는 섹션을 찾을 수 없습니다.`;
    return bodyMatched.map(s => lines.slice(s.start, s.end).join('\n')).join('\n\n---\n\n');
  }

  return matched.map(s => lines.slice(s.start, s.end).join('\n')).join('\n\n---\n\n');
}
