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

export const TOOLSET_NAMES = ['docs', 'payment', 'alimtalk', 'product', 'commerce', 'mall', 'page'] as const;
export type ToolsetName = typeof TOOLSET_NAMES[number];

/** 아무것도 지정하지 않았을 때 켜지는 묶음. README 의 「알림톡 도구는 기본 노출」 약속을 지킨다 */
export const DEFAULT_TOOLSETS: readonly ToolsetName[] = ['docs', 'payment', 'alimtalk'];

export const TOOLSET_DESCRIPTIONS: Readonly<Record<ToolsetName, string>> = {
    docs:     '문서 검색·SDK 버전·스택 판정·CSP·트러블슈팅 (항상 켜짐)',
    payment:  'PG 결제 연동 — 로그인·프로젝트·키체인·결제수단·위젯·generate_payment_code',
    alimtalk: '카카오 알림톡 — 채널·템플릿·발송·수신거부·웹훅 (alimtalk_*)',
    product:  '상품 관리 — 상품·카테고리·상세 블록·배송/구독 정책·이미지·디지털 코드',
    commerce: '커머스 API(쇼핑몰을 직접 만드는 개발자) — 커머스 키·몰 설정·결제 복귀 주소·generate_commerce_code (+ BOOTPAY_COMMERCE_ENABLED 면 commerce_*)',
    mall:     '쇼핑몰 운영 설정 — 몰 기본 정보·회원가입·주문/배송·약관 (get_mall_setting · update_mall_setting)',
    page:     '쇼핑몰 페이지 — 자유 페이지 초안·코드 블록(HTML) 쓰기 · 헤더 메뉴/푸터에 걸기',
};

/**
 * 어느 문으로 띄워도 항상 켜지는 문서 도구 — 문서 검색 · 읽기와 「다른 도구는 어떻게 켜나」 안내.
 * 알림톡 · 쇼핑몰 운영 문에는 결제 연동용 문서 도구(CSP · 스택 판정 등)가 필요 없어서 이것만 붙는다.
 */
export const CORE_DOCS_TOOLS = [
    'list_toolsets',
    'search_docs',
    'get_doc',
    'list_docs',
    'get_cs_guide',
] as const;

/** 문서 도구 — 로그인 없이 동작한다. 문 없이(BOOTPAY_TOOLSETS 만으로) 띄우면 docs 는 끌 수 없다 */
const DOCS_TOOLS = [
    ...CORE_DOCS_TOOLS,
    'detect_project_stack',
    'get_sdk_versions',
    'get_setup_checklist',
    'get_troubleshooting',
    'get_csp_allowlist',
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
] as const;

/** 판매자 조회 · 수정과 키 권한 목록 — 결제 · 커머스 키를 발급하는 묶음에서만 쓴다 */
const SELLER_ADMIN_TOOLS = [
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

/** 몰 설정 — 쇼핑몰 운영 문과 커머스 API 문 둘 다 쓴다(회원가입 항목 · 약관은 커머스 API 로 만든 몰에도 걸린다) */
const MALL_SETTING_TOOLS = [
    'get_mall_setting',
    'update_mall_setting',
] as const;

const COMMERCE_TOOLS = [
    ...MALL_SETTING_TOOLS,
    // 개발 중 주문서를 띄워 볼 상품이 있어야 해서 상품 묶음과 함께 쓴다
    'create_test_products',
    'list_checkout_return_domains',
    'register_checkout_return_domain',
    'unregister_checkout_return_domain',
    'generate_commerce_code',
    'browser_select_payment_method',
] as const;

/**
 * 쇼핑몰 자유 페이지(G13-M1) — 초안 만들기와 코드 블록 쓰기까지만. 게시 · 숨김 · 페이지 지우기 · 주소 바꾸기 도구는 두지 않는다
 * (판매자가 관리자 편집기에서 확인하고 게시한다). 기본 묶음이 아니다 — BOOTPAY_TOOLSETS 에 page 를 넣어야 켜진다.
 *
 * @comment_by Claude
 * @date: 2026-11-19
 */
export const PAGE_TOOLS = [
    'list_mall_pages',
    'get_mall_page',
    'get_page_authoring_guide',
    'create_mall_page',
    'check_page_code',
    'set_page_code_block',
    'get_page_code_block',
    'remove_page_code_block',
    'upload_page_images',
    'get_page_menu_places',
    'add_page_to_header_menu',
    'remove_page_from_header_menu',
    'set_page_footer_link',
] as const;

/** 상품 트랙은 원격 프로파일과 같은 묶음이다 — get_auth_status 만 계정 쪽으로 뺀다 */
const PRODUCT_TOOLS = REMOTE_TOOL_NAMES.filter(name => name !== 'get_auth_status');

const EXPLICIT: ReadonlyArray<readonly [ToolsetName, readonly string[]]> = [
    ['docs', DOCS_TOOLS],
    ['payment', [...ACCOUNT_TOOLS, ...SELLER_ADMIN_TOOLS, ...PAYMENT_TOOLS]],
    ['alimtalk', [...ACCOUNT_TOOLS, ...COMMERCE_KEY_TOOLS]],
    ['product', [...ACCOUNT_TOOLS, ...PRODUCT_TOOLS]],
    ['commerce', [...ACCOUNT_TOOLS, ...SELLER_ADMIN_TOOLS, ...COMMERCE_KEY_TOOLS, ...COMMERCE_TOOLS]],
    ['mall', [...ACCOUNT_TOOLS, ...MALL_SETTING_TOOLS]],
    ['page', [...ACCOUNT_TOOLS, ...PAGE_TOOLS]],
];

/**
 * 문(door) — 「누가 쓰나」 기준으로 묶음을 고른 실행 단위. `npx @bootpay/mcp <문>` 으로 고른다.
 * npm 패키지는 하나이고 문만 갈린다. 도구가 한 세션에 80개 넘게 실리면 모델이 비슷한 도구를 헷갈려서 나눴다.
 * 구매자 대신 장바구니 · 주문하는 도구(commerce_*)는 원격 /commerce/mcp 가 따로 맡는다.
 */
export const DOORS = {
    payment:  { toolsets: ['docs', 'payment'], name: 'Bootpay Payments', who: 'PG 결제를 붙이는 개발자' },
    commerce: { toolsets: ['docs', 'commerce'], name: 'Bootpay Commerce API', who: '커머스 API 로 쇼핑몰을 직접 만드는 개발자' },
    mall:     { toolsets: ['product', 'mall', 'page'], name: 'Bootpay Mall', who: '부트페이 쇼핑몰을 운영하는 판매자 (상품 · 몰 설정 · 자유 페이지)' },
    alimtalk: { toolsets: ['alimtalk'], name: 'Bootpay AlimTalk', who: '카카오 알림톡을 보내는 개발자 · 운영자' },
    all:      { toolsets: [...TOOLSET_NAMES], name: 'Bootpay MCP', who: '모든 도구' },
} as const satisfies Record<string, { toolsets: readonly ToolsetName[]; name: string; who: string }>;
export type DoorName = keyof typeof DOORS;
export const DOOR_NAMES = Object.keys(DOORS) as DoorName[];

/**
 * 실행 인자에서 문 이름을 읽는다. 플래그(-로 시작)는 건너뛴다.
 * 모르는 이름은 던지지 않고 warning 과 함께 기본 실행으로 돌린다 — 문을 도입하기 전 버전은 인자를 아예 보지 않아서,
 * 설정에 다른 인자를 넣어 둔 기존 사용자가 업데이트하는 순간 MCP 가 꺼지면 안 된다.
 */
export function parseDoor(argv: readonly string[]): { door?: DoorName; warning?: string } {
    const word = argv.find(a => !a.startsWith('-'));
    if (word === undefined) return {};
    const name = word.trim().toLowerCase();
    if (!(DOOR_NAMES as string[]).includes(name)) {
        return { warning: `알 수 없는 실행 인자 "${word}" 는 무시하고 기본 실행합니다. 문을 고르려면: ${DOOR_NAMES.join(', ')}` };
    }
    return { door: name as DoorName };
}

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
export function resolveToolsets(env: Record<string, string | undefined> = process.env, door?: DoorName): ToolsetName[] {
    const listed = (env.BOOTPAY_TOOLSETS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    // 문을 골랐으면 그 문의 묶음에 BOOTPAY_TOOLSETS 를 더한다(docs 를 강제하지 않는다).
    // 문이 없으면 예전대로 — 이름이 하나도 없으면(빈 값·"," 같은 오타) 기본값, docs 는 항상
    const requested = door ? [...DOORS[door].toolsets, ...listed] : listed.length > 0 ? listed : [...DEFAULT_TOOLSETS];

    const enabled = new Set<ToolsetName>(door ? [] : ['docs']);
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
        enabled.add('mall');
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
        // 문서 검색 · 읽기 · 묶음 안내는 어느 문에서든 켠다
        if ((CORE_DOCS_TOOLS as readonly string[]).includes(String(args[0]))) return register(...args);
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
export function registerListToolsetsTool(server: McpServer, enabled: readonly ToolsetName[], door?: DoorName): void {
    server.tool(
        'list_toolsets',
        '이 세션에 켜진·꺼진 부트페이 도구 묶음과, 다른 문(결제 · 커머스 API · 쇼핑몰 운영 · 알림톡)을 여는 방법을 알려 줍니다. 필요한 도구(상품·커머스·알림톡 등)가 목록에 없으면 이 도구를 부르고, 사용자에게 설정 변경을 안내하세요.',
        {},
        TOOL_READ_LOCAL,
        async () => {
            const disabled = TOOLSET_NAMES.filter(n => !enabled.includes(n));
            const all = [...enabled, ...disabled].join(',');
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify({
                        door: door ?? null,
                        enabled: enabled.map(name => ({ name, description: TOOLSET_DESCRIPTIONS[name] })),
                        disabled: disabled.map(name => ({ name, description: TOOLSET_DESCRIPTIONS[name] })),
                        doors: DOOR_NAMES.filter(d => d !== 'all').map(d => ({
                            door: d,
                            for: DOORS[d].who,
                            args: ['-y', '@bootpay/mcp@latest', d],
                        })),
                        how_to_enable: disabled.length === 0
                            ? '모든 묶음이 켜져 있습니다.'
                            : `필요한 일에 맞는 문을 MCP 설정 args 에 붙이세요(예: ["-y", "@bootpay/mcp@latest", "alimtalk"]). 묶음을 직접 고르려면 env 에 BOOTPAY_TOOLSETS="${all}" (또는 "all"). 바꾼 뒤 AI 클라이언트를 완전히 종료하고 다시 켜세요. 설정 파일은 사용자가 직접 고칩니다.`,
                        ...(door === undefined && enabled.includes('alimtalk')
                            ? { notice: DEFAULT_DOOR_NOTICE }
                            : {}),
                    }, null, 2),
                }],
            };
        },
    );
}

/** 문 없이 띄운 기본 세션에 붙는 안내 — 다음 버전에서 기본값이 결제(docs + payment)로 줄어든다 */
export const DEFAULT_DOOR_NOTICE = '다음 버전부터 기본 실행(npx @bootpay/mcp)에서 알림톡 도구가 빠집니다. 알림톡은 args 에 "alimtalk" 을 붙여 따로 띄우세요 — 예: ["-y", "@bootpay/mcp@latest", "alimtalk"].';
