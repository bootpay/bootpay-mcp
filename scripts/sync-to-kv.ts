/**
 * ai-docs 마크다운 콘텐츠를 Cloudflare KV에 동기화하는 스크립트.
 *
 * 사용법:
 *   npx tsx scripts/sync-to-kv.ts
 *   npx tsx scripts/sync-to-kv.ts --dry-run   # KV 업로드 없이 확인만
 *
 * wrangler.jsonc의 KV namespace 설정 필요.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = join(import.meta.dirname!, '../../../content');
const DATA_DIR = join(import.meta.dirname!, '../../../data');
const DRY_RUN = process.argv.includes('--dry-run');

interface DocEntry {
  path: string;
  title: string;
  description: string;
  category: string;
  slug: string;
}

// ── 마크다운 파일 수집 ──
function collectMarkdownFiles(dir: string, excludeDirs: string[] = []): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (excludeDirs.includes(entry) || entry.startsWith('.')) continue;
        walk(fullPath);
      } else if (entry.endsWith('.md') && entry !== 'index.md') {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// ── frontmatter 파싱 ──
function parseDoc(filePath: string): DocEntry & { content: string } {
  const raw = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const rel = relative(CONTENT_DIR, filePath).replace(/\.md$/, '');
  const parts = rel.split('/');
  const category = parts.length > 1 ? parts[0] : 'root';
  const slug = parts[parts.length - 1];

  return {
    path: rel,
    title: data.title || slug,
    description: data.description || '',
    category,
    slug,
    content: content.trim(),
  };
}

// ── KV bulk 업로드 ──
function uploadToKV(entries: Array<{ key: string; value: string }>) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] ${entries.length} keys to upload`);
    for (const e of entries.slice(0, 10)) {
      console.log(`  ${e.key} (${e.value.length} bytes)`);
    }
    if (entries.length > 10) console.log(`  ... and ${entries.length - 10} more`);
    return;
  }

  // wrangler kv bulk put은 JSON 배열을 stdin으로 받음
  const bulkData = entries.map(e => ({
    key: e.key,
    value: e.value,
  }));

  // 100개씩 배치 (wrangler 제한)
  const BATCH_SIZE = 100;
  for (let i = 0; i < bulkData.length; i += BATCH_SIZE) {
    const batch = bulkData.slice(i, i + BATCH_SIZE);
    const tmpFile = `/tmp/kv-bulk-${i}.json`;
    writeFileSync(tmpFile, JSON.stringify(batch));

    console.log(`  Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bulkData.length / BATCH_SIZE)} (${batch.length} keys)...`);
    execSync(`npx wrangler kv bulk put "${tmpFile}" --binding DOCS_KV --remote`, {
      cwd: join(import.meta.dirname!, '..'),
      stdio: 'inherit',
    });
  }
}

// ── 메인 ──
async function main() {
  console.log('🔍 마크다운 파일 수집 중...');
  const files = collectMarkdownFiles(CONTENT_DIR, ['public', 'node_modules']);

  console.log(`📄 ${files.length}개 문서 파싱 중...`);
  const docs: Array<DocEntry & { content: string }> = [];
  for (const file of files) {
    try {
      docs.push(parseDoc(file));
    } catch (e) {
      console.warn(`  ⚠️ 파싱 실패: ${file} — ${(e as Error).message}`);
    }
  }

  // 카테고리 집계
  const categories = [...new Set(docs.map(d => d.category))].sort();
  const categoryMap = new Map<string, DocEntry[]>();
  for (const doc of docs) {
    if (!categoryMap.has(doc.category)) categoryMap.set(doc.category, []);
    categoryMap.get(doc.category)!.push({
      path: doc.path,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      slug: doc.slug,
    });
  }

  console.log(`📂 카테고리: ${categories.join(', ')}`);

  // KV entries 준비
  const kvEntries: Array<{ key: string; value: string }> = [];

  // 1. 개별 문서
  for (const doc of docs) {
    kvEntries.push({
      key: `doc:${doc.path}`,
      value: `# ${doc.title}\n\n${doc.content}`,
    });
  }

  // 2. 전체 인덱스
  const index = {
    docs: docs.map(d => ({
      path: d.path,
      title: d.title,
      description: d.description,
      category: d.category,
      slug: d.slug,
    })),
    categories,
    lastUpdated: new Date().toISOString(),
  };
  kvEntries.push({ key: 'index:all', value: JSON.stringify(index) });

  // 3. 카테고리별 인덱스
  for (const [cat, catDocs] of categoryMap) {
    kvEntries.push({ key: `index:category:${cat}`, value: JSON.stringify(catDocs) });
  }

  // 4. CS 응대 가이드
  const csGuidePath = join(DATA_DIR, 'cs-response-guide.md');
  if (existsSync(csGuidePath)) {
    const csContent = readFileSync(csGuidePath, 'utf-8');
    kvEntries.push({ key: 'cs-guide', value: csContent });
    console.log(`📋 CS 가이드 포함 (${(csContent.length / 1024).toFixed(1)}KB)`);
  }

  // 5. 메타
  kvEntries.push({ key: 'meta:last-updated', value: new Date().toISOString() });

  console.log(`\n📦 총 ${kvEntries.length}개 KV 엔트리 (${(JSON.stringify(kvEntries).length / 1024).toFixed(0)}KB)`);
  console.log('🚀 KV 업로드 시작...');

  uploadToKV(kvEntries);

  console.log('\n✅ 동기화 완료!');
  console.log(`   문서: ${docs.length}개`);
  console.log(`   카테고리: ${categories.length}개`);
  console.log(`   KV 키: ${kvEntries.length}개`);
}

main().catch(e => {
  console.error('❌ 동기화 실패:', e);
  process.exit(1);
});
