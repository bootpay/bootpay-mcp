import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler } from 'agents/mcp';
import { z } from 'zod';
import type { Env } from './types.js';
import { getIndex, getDoc, getCsGuide } from './lib/kv.js';
import { searchDocs, searchCsGuide } from './lib/search.js';

function createServer(env: Env) {
  const server = new McpServer({
    name: 'Bootpay Developer Docs',
    version: '1.0.0',
  });

  // ── search_docs ──
  server.tool(
    'search_docs',
    'Bootpay 개발자 문서를 검색합니다. 결제, 정기결제, 구독, 주문, 고객, 웹훅 등 모든 문서를 검색할 수 있습니다.',
    {
      query: z.string().describe('검색 키워드 (예: "결제 연동", "빌링키", "웹훅 설정")'),
      category: z.string().optional().describe('카테고리 필터 (payment, billing, subscription, order, customer, webhook, guide, integration, architecture, invoice, product, recipes)'),
      limit: z.number().optional().default(5).describe('결과 수 (기본 5)'),
    },
    async ({ query, category, limit }) => {
      const index = await getIndex(env.DOCS_KV);
      const results = searchDocs(index.docs, query, { category, limit });

      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `"${query}"에 대한 검색 결과가 없습니다. 다른 키워드로 시도해 보세요.\n\n사용 가능한 카테고리: ${index.categories.join(', ')}`,
          }],
        };
      }

      const text = results.map((r, i) =>
        `${i + 1}. **${r.title}** (\`${r.path}\`)\n   ${r.snippet}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `${results.length}개 결과:\n\n${text}\n\n> 전체 내용을 보려면 get_doc 도구에 path를 전달하세요.`,
        }],
      };
    }
  );

  // ── get_doc ──
  server.tool(
    'get_doc',
    '특정 문서의 전체 내용을 마크다운으로 반환합니다.',
    {
      path: z.string().describe('문서 경로 (예: "payment/request", "billing/intro", "guide/keys")'),
    },
    async ({ path }) => {
      // 경로 정규화: 앞뒤 슬래시 제거
      const normalized = path.replace(/^\/+|\/+$/g, '');
      const content = await getDoc(env.DOCS_KV, normalized);

      if (!content) {
        const index = await getIndex(env.DOCS_KV);
        const suggestions = index.docs
          .filter(d => d.path.includes(normalized.split('/').pop() ?? ''))
          .slice(0, 5)
          .map(d => `  - ${d.path} (${d.title})`)
          .join('\n');

        return {
          content: [{
            type: 'text' as const,
            text: `"${normalized}" 문서를 찾을 수 없습니다.${suggestions ? `\n\n비슷한 문서:\n${suggestions}` : ''}`,
          }],
        };
      }

      return { content: [{ type: 'text' as const, text: content }] };
    }
  );

  // ── list_docs ──
  server.tool(
    'list_docs',
    '전체 문서 목록 또는 특정 카테고리의 문서 목록을 반환합니다.',
    {
      category: z.string().optional().describe('카테고리 필터 (생략하면 전체 목록)'),
    },
    async ({ category }) => {
      const index = await getIndex(env.DOCS_KV);
      let docs = index.docs;

      if (category) {
        docs = docs.filter(d => d.category === category);
        if (docs.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `"${category}" 카테고리를 찾을 수 없습니다.\n\n사용 가능한 카테고리: ${index.categories.join(', ')}`,
            }],
          };
        }
      }

      const grouped = new Map<string, typeof docs>();
      for (const doc of docs) {
        const cat = doc.category;
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(doc);
      }

      let text = `총 ${docs.length}개 문서`;
      if (category) text += ` (${category})`;
      text += `\n\n`;

      for (const [cat, catDocs] of grouped) {
        text += `## ${cat} (${catDocs.length})\n`;
        for (const doc of catDocs) {
          text += `- \`${doc.path}\` — ${doc.title}\n`;
        }
        text += '\n';
      }

      return { content: [{ type: 'text' as const, text }] };
    }
  );

  // ── get_cs_guide ──
  server.tool(
    'get_cs_guide',
    'Bootpay 고객응대 매뉴얼을 조회합니다. 섹션을 지정하면 해당 부분만 반환합니다.',
    {
      section: z.string().optional().describe('검색할 섹션 키워드 (예: "PG 심사", "사업자 변경", "결제 취소"). 생략하면 전체 반환.'),
    },
    async ({ section }) => {
      const guide = await getCsGuide(env.DOCS_KV);
      if (!guide) {
        return { content: [{ type: 'text' as const, text: 'CS 가이드가 아직 등록되지 않았습니다.' }] };
      }

      const result = searchCsGuide(guide, section);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  return server;
}

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        name: 'Bootpay Developer Docs MCP',
        status: 'ok',
        endpoint: '/mcp',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // MCP endpoint
    if (url.pathname === '/mcp') {
      // Accept 헤더가 없거나 부족한 클라이언트 보정
      // Streamable HTTP 프로토콜은 text/event-stream을 요구함
      const accept = req.headers.get('Accept') ?? '';
      if (req.method === 'POST' && !accept.includes('text/event-stream')) {
        const headers = new Headers(req.headers);
        headers.set('Accept', 'application/json, text/event-stream');
        req = new Request(req, { headers });
      }

      const server = createServer(env);
      const handler = createMcpHandler(server);
      return handler(req, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  },
};
