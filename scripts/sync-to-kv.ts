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
const VERSION_FILE = join(CONTENT_DIR, 'public/version.json');
const DRY_RUN = process.argv.includes('--dry-run');

// ── version.json 로드 ──
const versions: Record<string, string> = JSON.parse(readFileSync(VERSION_FILE, 'utf-8'));

// ── Vue 컴포넌트를 LLM-readable 마크다운으로 치환 ──
// VitePress 문서는 Vue 컴포넌트를 사용하지만, MCP로 제공할 때는
// AI가 읽을 수 있는 순수 마크다운으로 변환해야 한다.

function expandVueComponents(markdown: string): string {
  let result = markdown;

  // ── 1. <SdkInstall> → 설치 명령어 (version.json 기반) ──
  result = result.replace(/<SdkInstall\s+type="(\w+)"\s*\/>/g, (_m, type: string) => {
    if (type === 'client') {
      return `### SDK 설치 (클라이언트)

**Web (NPM)**
\`\`\`bash
npm install @bootpay/client-js@${versions.js}
\`\`\`

**Web (CDN)**
\`\`\`html
<script src="https://js.bootpay.co.kr/bootpay-${versions.js}.min.js"></script>
\`\`\`

**Android (build.gradle)**
\`\`\`gradle
dependencies {
    implementation 'kr.co.bootpay:android:${versions.android}'
}
\`\`\`

**iOS (CocoaPods)**
\`\`\`ruby
pod 'Bootpay', '~> ${versions.ios}'
\`\`\`

**Flutter (pubspec.yaml)**
\`\`\`yaml
dependencies:
  bootpay: ^${versions.flutter}
\`\`\`

**React Native**
\`\`\`bash
npm install react-native-bootpay-api@${versions.react_native}
cd ios && pod install
\`\`\``;
    }
    if (type === 'server') {
      return `### SDK 설치 (서버)

**Node.js**
\`\`\`bash
npm install @bootpay/backend-js@${versions.nodejs}
\`\`\`

**Python**
\`\`\`bash
pip install bootpay-backend==${versions.python}
\`\`\`

**PHP**
\`\`\`bash
composer require bootpay/server-php
\`\`\`

**Java (Maven)**
\`\`\`xml
<dependency>
    <groupId>kr.co.bootpay</groupId>
    <artifactId>backend</artifactId>
    <version>${versions.java}</version>
</dependency>
\`\`\`

**Ruby**
\`\`\`bash
gem install bootpay-backend -v ${versions.ruby}
\`\`\`

**Go**
\`\`\`bash
go get github.com/bootpay/backend-go/v2@${versions.go}
\`\`\`

**.NET**
\`\`\`bash
dotnet add package Bootpay --version ${versions.aspnet}
\`\`\``;
    }
    if (type === 'webview') {
      return `### SDK 설치 (웹뷰)

**Android (build.gradle)**
\`\`\`gradle
dependencies {
    implementation 'kr.co.bootpay:webview:${versions.android}'
}
\`\`\`

**iOS (CocoaPods)**
\`\`\`ruby
pod 'Bootpay', '~> ${versions.ios}'
\`\`\`

**Flutter (pubspec.yaml)**
\`\`\`yaml
dependencies:
  bootpay_webview_flutter: ^${versions.flutter}
\`\`\`

**React Native**
\`\`\`bash
npm install react-native-webview-bootpay@${versions.react_native_webview_bootpay}
cd ios && pod install
\`\`\``;
    }
    return _m;
  });

  // ── 2. <ApiEndpoint> → 평문 API 정보 ──
  result = result.replace(
    /<ApiEndpoint\s+method="([^"]+)"\s+url="([^"]+)"(?:\s+auth="([^"]+)")?\s*\/>/g,
    (_m, method: string, url: string, auth?: string) => {
      let out = `> **${method}** \`${url}\``;
      if (auth) out += `\n> 인증: ${auth}`;
      return out;
    },
  );

  // ── 3. <Parameters>, <ErrorCodes>, <ResponseExample> → 래퍼 태그 제거, 내부 콘텐츠 유지 ──
  for (const tag of ['Parameters', 'ErrorCodes', 'ResponseExample', 'ResponseFields']) {
    const re = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'g');
    result = result.replace(re, '$1');
  }

  // ── 4. <ApprovalOnly>, <BillingOnly>, <WebhookOnly>, <SdkOnly> → 조건 라벨 + 내부 콘텐츠 유지 ──
  for (const tag of ['ApprovalOnly', 'BillingOnly', 'WebhookOnly', 'SdkOnly']) {
    const re = new RegExp(`<${tag}(?:\\s+[^>]*)?>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'g');
    result = result.replace(re, '$1');
  }

  // ── JS 객체 리터럴 파서 (Vue 템플릿 속성에서 사용) ──
  // regex 기반 JSON 변환은 문자열 내부 ':' 등에서 깨지므로 Function 생성자 사용
  const evalJsLiteral = (s: string): any => {
    try {
      return new Function(`return ${s}`)();
    } catch {
      return null;
    }
  };

  // ── 5. <CanvasSequence> → 텍스트 시퀀스 다이어그램 ──
  result = result.replace(/<CanvasSequence\s([\s\S]*?)\/>/g, (_m, attrs: string) => {
    try {
      const participantsMatch = attrs.match(/:participants="(\[[\s\S]*?\])"/);
      const messagesMatch = attrs.match(/:messages="(\[[\s\S]*?\])"/);
      if (!participantsMatch || !messagesMatch) return '';

      const participants = evalJsLiteral(participantsMatch[1]);
      const messages = evalJsLiteral(messagesMatch[1]);
      if (!participants || !messages) return '';

      const labelMap = Object.fromEntries(participants.map((p: any) => [p.id, p.label]));
      const lines = ['```', `[시퀀스 다이어그램]`];
      for (const msg of messages) {
        const fromLabel = labelMap[msg.from] || msg.from;
        const toLabel = labelMap[msg.to] || msg.to;
        const arrow = msg.type === 'dashed' ? '-->' : '→';
        if (msg.from === msg.to) {
          lines.push(`  ${fromLabel}: ${msg.label}`);
        } else {
          lines.push(`  ${fromLabel} ${arrow} ${toLabel}: ${msg.label}`);
        }
      }
      lines.push('```');
      return lines.join('\n');
    } catch {
      return '';
    }
  });

  // ── 6. <CanvasFlow> → 텍스트 플로우차트 ──
  result = result.replace(/<CanvasFlow\s([\s\S]*?)\/>/g, (_m, attrs: string) => {
    try {
      const nodesMatch = attrs.match(/:nodes="(\[[\s\S]*?\])"/);
      const edgesMatch = attrs.match(/:edges="(\[[\s\S]*?\])"/);
      if (!nodesMatch) return '';

      const nodes = evalJsLiteral(nodesMatch[1]);
      const edges = edgesMatch ? evalJsLiteral(edgesMatch[1]) : [];
      if (!nodes) return '';

      const labelMap = Object.fromEntries(nodes.map((n: any) => [n.id, n.label]));
      const lines = ['```', `[플로우차트]`];
      for (const edge of (edges || [])) {
        const fromLabel = labelMap[edge.from] || edge.from;
        const toLabel = labelMap[edge.to] || edge.to;
        const label = edge.label ? ` (${edge.label})` : '';
        lines.push(`  ${fromLabel} → ${toLabel}${label}`);
      }
      lines.push('```');
      return lines.join('\n');
    } catch {
      return '';
    }
  });

  // ── 7. <CanvasState> → 텍스트 상태 다이어그램 ──
  result = result.replace(/<CanvasState\s([\s\S]*?)\/>/g, (_m, attrs: string) => {
    try {
      const statesMatch = attrs.match(/:states="(\[[\s\S]*?\])"/);
      if (!statesMatch) return '';

      const states = evalJsLiteral(statesMatch[1]);
      if (!states) return '';

      const labelMap = Object.fromEntries(states.map((s: any) => [s.id, s.label]));
      const lines = ['```', `[상태 다이어그램]`];
      for (const state of states) {
        if (state.transitions) {
          for (const t of state.transitions) {
            const toLabel = labelMap[t.to] || t.to;
            lines.push(`  ${state.label} → ${toLabel}: ${t.label}`);
          }
        }
      }
      lines.push('```');
      return lines.join('\n');
    } catch {
      return '';
    }
  });

  // ── 8. UI 전용 컴포넌트 제거 (콘텐츠 없는 셀프클로징 태그) ──
  result = result.replace(/<(?:InlineSdkSelector|ApprovalModeSelector|BillingModeSelector|WebhookTypeSelector|ChooseFlowChart|SdkVersion)\s*[^>]*\/>/g, '');

  // ── 9. VitePress ::: 컨테이너 → 명확한 라벨 ──
  result = result.replace(/^:::\s*(tip|info|warning|danger|details)(?:\s+(.*))?$/gm, (_m, type: string, title?: string) => {
    const labels: Record<string, string> = { tip: 'TIP', info: 'INFO', warning: 'WARNING', danger: 'DANGER', details: 'DETAILS' };
    const label = labels[type] || type.toUpperCase();
    return title ? `> **${label}: ${title.trim()}**` : `> **${label}**`;
  });
  result = result.replace(/^:::$/gm, '');

  // ── 10. ::: code-group → 그대로 유지 (코드 블록은 이미 마크다운) ──
  result = result.replace(/^:::\s*code-group\s*$/gm, '');

  return result;
}

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
    content: expandVueComponents(content.trim()),
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

// ── 예제 동기화 ──
interface ExampleMeta {
  id: string;
  title: string;
  description: string;
  platform: string;
  files: string[];
}

const EXAMPLE_PLATFORM_MAP: Record<string, string> = {
  'web-vanilla': 'web',
  'web-react': 'web',
  'web-order-flow': 'web',
  'flutter': 'flutter',
  'android': 'android',
  'ios': 'ios',
  'react-native': 'react-native',
};

const EXAMPLE_CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.html', '.kt', '.swift', '.dart', '.yaml', '.json', '.gradle', '.ruby', '.env.example'];

function syncExamples(examplesDir: string, kvEntries: Array<{ key: string; value: string }>): ExampleMeta[] {
  const index: ExampleMeta[] = [];

  const dirs = readdirSync(examplesDir).filter(d => {
    const fullPath = join(examplesDir, d);
    return statSync(fullPath).isDirectory() && d !== 'node_modules' && !d.startsWith('.');
  });

  for (const dir of dirs) {
    const exDir = join(examplesDir, dir);
    const readmePath = join(exDir, 'README.md');

    if (!existsSync(readmePath)) continue;

    const readme = readFileSync(readmePath, 'utf-8');
    const titleMatch = readme.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : dir;

    // 설명은 README 첫 문단 (제목 다음)
    const descMatch = readme.match(/^#[^\n]+\n+([^\n#]+)/m);
    const description = descMatch ? descMatch[1].trim() : '';

    // 소스 파일 수집
    const sourceFiles = collectSourceFiles(exDir);
    const fileNames = sourceFiles.map(f => relative(exDir, f));

    // 마크다운으로 합쳐서 KV에 저장
    const sections = [readme, '\n---\n'];

    for (const file of sourceFiles) {
      const relPath = relative(exDir, file);
      const ext = relPath.split('.').pop() ?? '';
      const lang = extToLang(ext);
      const content = readFileSync(file, 'utf-8');
      sections.push(`\n## \`${relPath}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n`);
    }

    const combined = sections.join('\n');
    kvEntries.push({ key: `example:${dir}`, value: combined });

    const meta: ExampleMeta = {
      id: dir,
      title,
      description,
      platform: EXAMPLE_PLATFORM_MAP[dir] ?? 'web',
      files: fileNames,
    };
    index.push(meta);

    console.log(`   📄 ${dir}: ${fileNames.length}개 파일 (${(combined.length / 1024).toFixed(1)}KB)`);
  }

  kvEntries.push({ key: 'examples:index', value: JSON.stringify(index) });
  return index;
}

function collectSourceFiles(dir: string, depth = 0): string[] {
  if (depth > 3) return []; // 과도한 재귀 방지

  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath, depth + 1));
    } else if (EXAMPLE_CODE_EXTENSIONS.some(ext => entry.endsWith(ext)) || entry === '.env.example') {
      files.push(fullPath);
    }
  }

  return files;
}

function extToLang(ext: string): string {
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    html: 'html', kt: 'kotlin', swift: 'swift', dart: 'dart',
    yaml: 'yaml', json: 'json', gradle: 'gradle', ruby: 'ruby',
    example: 'bash',
  };
  return map[ext] ?? ext;
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

  // 5. 예제 코드
  const EXAMPLES_DIR = join(import.meta.dirname!, '../../../examples');
  if (existsSync(EXAMPLES_DIR)) {
    console.log('\n📦 예제 코드 수집 중...');
    const examplesIndex = syncExamples(EXAMPLES_DIR, kvEntries);
    console.log(`   예제: ${examplesIndex.length}개`);
  }

  // 6. SDK 버전 정보 (version.json → KV)
  kvEntries.push({ key: 'meta:sdk-versions', value: JSON.stringify(versions) });
  console.log(`📌 SDK 버전 포함: JS ${versions.js}, Flutter ${versions.flutter}, Android ${versions.android}`);

  // 7. 메타
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
