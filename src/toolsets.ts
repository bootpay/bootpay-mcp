import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { REMOTE_TOOL_NAMES } from './admin/tools/remote-tools.js';
import { TOOL_READ_LOCAL } from './lib/tool-annotations.js';

/**
 * stdio 도구 묶음(toolset) — 붙는 순간 모델 컨텍스트에 실리는 도구 표면을 사용자가 고르게 한다.
 *
 * 도구 114개를 전부 노출하면 설명·스키마만 16만 자가 넘는다(2026-09-23 실측, 상품 묶음이 그 절반).
 * Cursor·ChatGPT 커넥터처럼 도구 목록을 통째로 싣는 클라이언트에서는 대화가 시작되기도 전에 컨텍스트가 줄어든다.
 * 그래서 기본은 문서·결제·알림톡만 켜고, 상품·커머스는 env `BOOTPAY_TOOLSETS` 로 켠다.
 *
 * 두 가지를 지킨다.
 * 1) 거르는 곳은 **등록 단계**다 (profiles.ts 와 같은 이유) — 목록에 있는데 호출만 막으면 모델이 없는 길을 두드린다.
 * 2) 모르는 묶음 이름은 기동 시점에 던진다 — 오타가 조용히 "도구 0개"나 "전수 노출"로 떨어지면 원인을 못 찾는다.
 *
 * @comment_by ehowlsla
 * @date: 2026-09-23
 */

export const TOOLSET_NAMES = ['docs', 'payment', 'alimtalk', 'product', 'commerce'] as const;
export type ToolsetName = typeof TOOLSET_NAMES[number];

/** 아무것도 지정하지 않았을 때 켜지는 묶음. README 의 「알림톡 도구는 기본 노출」 약속을 지킨다 */
export const DEFAULT_TOOLSETS: readonly ToolsetName[] = ['docs', 'payment', 'alimtalk'];

export const TOOLSET_DESCRIPTIONS: Readonly<Record<ToolsetName, string>> = {
    docs:     '문서 검색·SDK 버전·스택 판정·CSP·트러블슈팅 (항상 켜짐)',
    payment:  'PG 결제 연동 — 로그인·프로젝트·키체인·결제수단·위젯·generate_payment_code',
    alimtalk: '카카오 알림톡 — 채널·템플릿·발송·수신거부·웹훅 (alimtalk_*)',
    product:  '상품 관리 — 상품·카테고리·상세 블록·배송/구독 정책·이미지·디지털 코드',
    commerce: '커머스 쇼핑몰 — 커머스 키·몰 설정·generate_commerce_code (+ BOOTPAY_COMMERCE_ENABLED 면 commerce_*)',
};

/** 문서 도구 — 로그인 없이 동작한다. docs 는 끌 수 없다 */
const DOCS_TOOLS = [
    'list_toolsets',
    'detect_project_stack',
    'get_sdk_versions',
    'search_docs',
    'get_doc',
    'list_docs',
    'get_setup_checklist',
    'get_troubleshooting',
    'get_csp_allowlist',
    'get_cs_guide',
] as const;

/** 관리자 로그인·프로젝트 — 관리자 API 를 부르는 묶음이면 어디서든 필요하다 */
const ACCOUNT_TOOLS = [
    'login',
    'browser_login',
    'logout',
    'set_token',
    'get_auth_status',
    'list_projects',
    'switch_project',
    'browser_select_project',
    'create_project',
    'create_seller',
    'search_sellers',
    'get_seller',
    'update_seller',
    'list_api_scopes',
] as const;

const PAYMENT_TOOLS = [
    'list_keychains',
    'create_keychain',
    'delete_keychain',
    'get_payment_settings',
    'activate_payment_method',
    'set_sandbox_mode',
    'set_payment_mode',
    'update_payment_resource',
    'list_widgets',
    'get_widget',
    'create_widget',
    'get_widget_default_styles',
    'configure_widget',
    'update_widget',
    'delete_widget',
    'get_integration_context',
    'generate_payment_code',
] as const;

/** 커머스 연동키 — 알림톡도 이 키로 부른다(instructions 의 알림톡 키 발급 경로) */
const COMMERCE_KEY_TOOLS = [
    'set_commerce_credentials',
    'get_commerce_context',
    'get_commerce_keys',
    'create_commerce_keys',
] as const;

const COMMERCE_TOOLS = [
    'get_mall_setting',
    'update_mall_setting',
    'generate_commerce_code',
    'browser_select_payment_method',
] as const;

/** 상품 트랙은 원격 프로파일과 같은 묶음이다 — get_auth_status 만 계정 쪽으로 뺀다 */
const PRODUCT_TOOLS = REMOTE_TOOL_NAMES.filter(name => name !== 'get_auth_status');

const EXPLICIT: ReadonlyArray<readonly [ToolsetName, readonly string[]]> = [
    ['docs', DOCS_TOOLS],
    ['payment', [...ACCOUNT_TOOLS, ...PAYMENT_TOOLS]],
    ['alimtalk', [...ACCOUNT_TOOLS, ...COMMERCE_KEY_TOOLS]],
    ['product', [...ACCOUNT_TOOLS, ...PRODUCT_TOOLS]],
    ['commerce', [...ACCOUNT_TOOLS, ...COMMERCE_KEY_TOOLS, ...COMMERCE_TOOLS]],
];

/**
 * 도구가 속한 묶음. 둘 이상에 속하면 그중 하나만 켜져도 등록된다.
 * 어디에도 속하지 않는 도구는 null — 새 도구가 조용히 사라지지 않도록 항상 등록하고,
 * toolsets.test.ts 가 null 이 하나라도 있으면 깨진다(목록에 넣으라는 신호).
 */
export function toolsetsOf(name: string): ToolsetName[] | null {
    if (name.startsWith('alimtalk_')) return ['alimtalk'];
    if (name.startsWith('commerce_')) return ['commerce'];
    const found = EXPLICIT.filter(([, tools]) => tools.includes(name)).map(([set]) => set);
    return found.length > 0 ? found : null;
}

/**
 * env 를 묶음 목록으로 바꾼다.
 *
 * - `BOOTPAY_TOOLSETS=payment,product` — 쉼표 구분. `all` 은 전부. 이름이 하나도 없으면 기본값
 * - docs 는 항상 들어간다(끄면 문서 도구 없이 결제 코드를 만들게 된다)
 * - `BOOTPAY_COMMERCE_ENABLED=true` 는 commerce 와 product 를 켠 것으로 본다 — 그 env 를 쓰던 사용자는 묶음 도입 전
 *   (전 도구 + commerce_*) 표면을 그대로 받는다. 쇼핑몰을 만들면 상품 등록 도구가 곧 필요해서 product 를 함께 켠다
 */
export function resolveToolsets(env: Record<string, string | undefined> = process.env): ToolsetName[] {
    const listed = (env.BOOTPAY_TOOLSETS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    // 이름이 하나도 없으면(빈 값·"," 같은 오타) 기본값 — docs 만 남는 조용한 축소를 막는다
    const requested = listed.length > 0 ? listed : [...DEFAULT_TOOLSETS];

    const enabled = new Set<ToolsetName>(['docs']);
    for (const name of requested) {
        if (name === 'all') {
            TOOLSET_NAMES.forEach(n => enabled.add(n));
            continue;
        }
        if (!(TOOLSET_NAMES as readonly string[]).includes(name)) {
            throw new Error(
                `알 수 없는 BOOTPAY_TOOLSETS 값입니다: "${name}". 가능한 값: ${TOOLSET_NAMES.join(', ')}, all`,
            );
        }
        enabled.add(name as ToolsetName);
    }
    if (env.BOOTPAY_COMMERCE_ENABLED === 'true') {
        enabled.add('commerce');
        enabled.add('product');
    }

    return TOOLSET_NAMES.filter(n => enabled.has(n));
}

/**
 * 등록용 서버 표면을 묶음으로 감싼다. `server.tool` 만 가로채고 나머지는 원본에 흘려보낸다.
 * 실제 등록은 원본 서버에 쌓이므로 호출자는 원본으로 connect 한다.
 */
export function applyToolsets(server: McpServer, enabled: readonly ToolsetName[]): McpServer {
    if (TOOLSET_NAMES.every(n => enabled.includes(n))) return server;

    const register = (server.tool as (...args: unknown[]) => unknown).bind(server);
    const tool = (...args: unknown[]): unknown => {
        const sets = toolsetsOf(String(args[0]));
        if (sets && !sets.some(s => enabled.includes(s))) return undefined;
        return register(...args);
    };

    return new Proxy(server, {
        get(target, prop) {
            if (prop === 'tool') return tool;
            const value = Reflect.get(target, prop, target);
            return typeof value === 'function' ? (value as Function).bind(target) : value;
        },
    });
}

/**
 * 꺼진 묶음이 무엇이고 어떻게 켜는지 모델이 사용자에게 말할 수 있게 한다.
 * 도구가 안 보인다고 모델이 기억으로 대신 답하는 것을 막는 자리다.
 */
export function registerListToolsetsTool(server: McpServer, enabled: readonly ToolsetName[]): void {
    server.tool(
        'list_toolsets',
        '이 세션에 켜진·꺼진 부트페이 도구 묶음과 켜는 방법을 알려 줍니다. 필요한 도구(상품·커머스·알림톡 등)가 목록에 없으면 이 도구를 부르고, 사용자에게 설정 변경을 안내하세요.',
        {},
        TOOL_READ_LOCAL,
        async () => {
            const disabled = TOOLSET_NAMES.filter(n => !enabled.includes(n));
            const all = [...enabled, ...disabled].join(',');
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify({
                        enabled: enabled.map(name => ({ name, description: TOOLSET_DESCRIPTIONS[name] })),
                        disabled: disabled.map(name => ({ name, description: TOOLSET_DESCRIPTIONS[name] })),
                        how_to_enable: disabled.length === 0
                            ? '모든 묶음이 켜져 있습니다.'
                            : `MCP 설정의 env 에 BOOTPAY_TOOLSETS="${all}" (또는 "all") 을 넣고 AI 클라이언트를 완전히 종료한 뒤 다시 켜세요. 설정 파일은 사용자가 직접 고칩니다.`,
                    }, null, 2),
                }],
            };
        },
    );
}
