// 공개 npm 패키지(@bootpay/mcp)를 stdio 로 띄워 initialize → tools/list 가 되는지 확인한다.
// 키 없이 뜨는 문서 · 결제 연동 · 알림톡 도구 묶음이 기본이다.
import { spawn } from 'node:child_process';

const child = spawn('npx', ['-y', '@bootpay/mcp@latest'], { stdio: ['pipe', 'pipe', 'inherit'] });
let buffer = '';
const pending = new Map();

child.stdout.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const message = JSON.parse(line);
    pending.get(message.id)?.(message);
  }
});

function call(id, method, params = {}) {
  return new Promise((resolve) => {
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

const timer = setTimeout(() => { console.error('timeout'); child.kill(); process.exit(1); }, 120_000);
const init = await call(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'ci-smoke', version: '1' } });
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
const list = await call(2, 'tools/list');
clearTimeout(timer);
child.kill();

const tools = list.result?.tools ?? [];
console.log(`${init.result?.serverInfo?.name} ${init.result?.serverInfo?.version}: ${tools.length} tools`);
if (tools.length === 0) process.exit(1);
