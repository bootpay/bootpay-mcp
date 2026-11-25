# 쇼핑몰 페이지를 AI 로 꾸미기 — `page` 도구 묶음

Claude · Cursor 같은 AI 도구가 부트페이 쇼핑몰의 **자유 페이지**(`/page/<주소>`) 초안을 만들고, 그 초안에 **코드 블록**(HTML·CSS)을 씁니다.
AI 도구는 **초안만** 씁니다. 손님에게 보이게 하는 게시는 판매자가 관리자 편집기에서 모습을 확인한 뒤 직접 합니다.
사용자가 요청하면 그 페이지를 **헤더 메뉴에 넣거나 빼고, 푸터 링크를 켜고 끌** 수 있습니다(관리자 「페이지 설정」 탭과 같은 일, 2.19.0).

---

## 1. 켜기

`page` 는 기본 묶음이 아닙니다. stdio(로컬 설치) 설정의 env `BOOTPAY_TOOLSETS` 에 `page` 를 더하세요. 원격(HTTP) 연결에는 이 도구가 없습니다.

**Claude Desktop** — `claude_desktop_config.json`
```json
{
  "mcpServers": {
    "bootpay": {
      "command": "npx",
      "args": ["-y", "@bootpay/mcp@latest"],
      "env": { "BOOTPAY_TOOLSETS": "payment,alimtalk,page" }
    }
  }
}
```

**Claude Code (CLI)**
```bash
claude mcp add bootpay -e BOOTPAY_TOOLSETS=payment,alimtalk,page -- npx -y @bootpay/mcp@latest
```

**Codex** — `~/.codex/config.toml`
```toml
[mcp_servers.bootpay]
command = "npx"
args = ["-y", "@bootpay/mcp@latest"]

[mcp_servers.bootpay.env]
BOOTPAY_TOOLSETS = "payment,alimtalk,page"   # "all" 이면 전부
```

- 설정을 저장한 뒤 AI 클라이언트를 **완전히 종료하고 다시 켜야** 반영됩니다
- 도구가 안 보이면 `list_toolsets` 가 켜진 묶음과 켜는 방법을 알려 줍니다
- 코드 블록은 **부트페이 결제 가맹을 마친 쇼핑몰**에서 쓸 수 있습니다. 가맹 전이면 도구가 그 이유를 알려 줍니다

---

## 2. 흐름

```
① browser_login → browser_select_project     로그인 + 쇼핑몰 고르기
② get_page_authoring_guide                   허용 태그·CSS, 빠지는 것, 한도, 사진 주소 규칙, 링크에 쓸 몰 주소(code.links), 몰 테마 색·글꼴
③ list_mall_pages → get_mall_page            페이지와 초안 번호(revision)
   (새 페이지면) create_mall_page(name, slug, template)
④ upload_page_images(image_paths | image_urls) 사진이 있으면 먼저 올리고, 받은 주소만 <img src> 에
⑤ check_page_code(html, css, title)           저장하지 않고 검사 — 빠지는 것(report.removed)·경고를 고친다
⑥ set_page_code_block(page_id, title, html, css, base_revision)
   → 초안에 저장. 응답의 must_tell_user 와 editor_url 을 사용자에게 그대로 전한다
⑦ 판매자가 editor_url(관리자 편집기)에서 모습을 확인하고 게시
⑧ (사용자가 요청하면) get_page_menu_places → add_page_to_header_menu · set_page_footer_link
```

예시 요청: "우리 쇼핑몰에 '브랜드 이야기' 페이지를 만들고, ~/Desktop/studio.jpg 사진과 연혁을 넣은 코드 블록을 써 줘. 연혁 내용은 내가 불러 줄게."

### 도구

| 도구 | 서버 창구 | 하는 일 |
|------|-----------|---------|
| `list_mall_pages` | `GET /mall-pages` | 페이지 이름·주소·상태·게시 전 고친 내용 여부 |
| `get_mall_page` | `GET /mall-pages/:id` | 설정·초안 번호(`revision`)·블록 목록(코드 블록은 이름·크기만)·쓸 수 있는지 |
| `get_page_authoring_guide` | `GET /mall-pages/authoring-guide` | 코드 작성 안내 |
| `create_mall_page` | `POST /mall-pages` | 초안 페이지 만들기(시작 틀 `blank`·`about`·`guide`·`store`·`event`) |
| `check_page_code` | `POST /mall-pages/code-blocks/check` | 저장 없이 검사 |
| `set_page_code_block` | `POST /mall-pages/:id/code-blocks` | 코드 블록 넣기·바꾸기 |
| `get_page_code_block` | `GET /mall-pages/:id/code-blocks/:block_id` | 저장된 코드 읽기 |
| `remove_page_code_block` | `DELETE /mall-pages/:id/code-blocks/:block_id` | 초안에서 코드 블록 하나 빼기 |
| `upload_page_images` | 쇼핑몰 저장소 | 사진 올리기(로컬 파일은 stdio 에서만) |
| `get_page_menu_places` | `GET /mall-pages/:id` · `GET /mall-menu`(+ 메뉴가 없으면 `GET /mall-menu/category-seed`) | 헤더 메뉴에 넣을 자리 · 걸린 곳(저장하지 않음) |
| `add_page_to_header_menu` | `PUT /mall-menu` | 헤더 메뉴에 넣기 |
| `remove_page_from_header_menu` | `PUT /mall-menu` | 그 페이지를 가리키는 메뉴 빼기(하위 포함) |
| `set_page_footer_link` | `PUT /mall-pages/:id { use_footer_link }` | 푸터 「쇼핑몰 안내」 줄 링크 보이기·숨기기 |

### 자리와 번호

- `set_page_code_block` 에 `block_id` 를 주면 그 코드 블록의 이름·HTML·CSS 만 바꿉니다(자리는 그대로).
- 새로 넣을 때 `after_block_id` 를 **빼면 맨 아래**, 블록 id 를 주면 **그 뒤**, `null` 이면 **맨 앞**에 들어갑니다.
- `base_revision` 은 `get_mall_page`(또는 직전 쓰기 응답)의 `revision` 입니다. 그사이 관리자 화면에서 먼저 고쳤으면 409 가 오니,
  `get_mall_page` 로 새 번호와 블록을 다시 받아 시도합니다.

### 코드 규칙(요약 — 정본은 `get_page_authoring_guide`)

- 스크립트(JS)는 받지 않습니다. HTML·CSS 로만 쓰고, CSS 는 `css` 칸에 넣습니다(HTML 안 `<style>` 은 빠집니다).
- 휴대폰 390px 폭부터 맞춥니다. 넓은 화면은 `@media (min-width: …)` 안에서 넓힙니다.
- 사진은 `upload_page_images` 가 준 주소(https · `bootapi.com`·`bootpay.co.kr`·`bootpay.shop` 과 하위 주소)만 보입니다.
- 링크(`<a href>`)는 안내의 `code.links` 에 있는 주소(`mall` — 이 몰에 있는 화면 · 켜진 고객지원 게시판 · 약관 · 공개한 쇼핑몰 페이지, `sns` — 판매자 채널)와
  `patterns`(상품 `/p/{id}` · 카테고리 `/?category_id={id}` · 기획전 `/catalog/{id}`)에 실제 id 를 넣은 주소만 씁니다. 지어낸 주소는 손님 화면에서 「찾는 페이지가 없어요」가 됩니다.
- 한 블록은 HTML+CSS 합쳐 100KB, 한 페이지에 코드 블록 5개, 페이지는 몰마다 30개까지입니다.
- 가격·주소·전화·영업시간처럼 쇼핑몰 정보에 없는 숫자·사실은 지어내지 않고 판매자에게 묻습니다.
- 서버는 허용하지 않는 것을 거절하지 않고 빼고 저장합니다. 뺀 것은 `report.removed` 와 `must_tell_user`(「n가지를 뺐어요: …」)로 알려 줍니다.

### 헤더 메뉴 · 푸터 걸기

- **저장하면 바로 반영됩니다.** 사용자가 걸어 달라고 했을 때만, `get_page_menu_places` 의 자리(`places`)와 메뉴 이름을 확인받고 씁니다.
  게시 전 · 숨김 페이지는 걸어도 손님 화면에 보이지 않고, 공개되면 그때 보입니다.
- 자리는 **1단 맨 끝**과 1단 메뉴마다 **「○○ 아래」(그 아래 맨 끝)**뿐입니다. 3단 자리 · 순서 바꾸기는 관리자 메뉴 관리(`menu_admin_url`)에서 합니다.
- 한도는 관리자 메뉴와 같습니다 — 1단 12개 · 한 항목 아래 30개 · 모두 200개 · 3단까지 · 메뉴 이름 20자. 하위 카테고리 자동 채우기 항목 아래에는 넣을 수 없습니다.
- 헤더 메뉴가 아직 없으면 지금 헤더에 자동으로 보이는 카테고리로 메뉴를 만들고 그 뒤에 더합니다(헤더에서 카테고리가 사라지지 않게, PC 표시는 「1단만」).
- 이미 걸린 페이지는 다시 넣지 않습니다. 자리를 바꾸려면 `remove_page_from_header_menu` 로 뺀 뒤 다시 넣습니다.
- 메뉴는 저장 번호(version)로 동시 저장을 막습니다. 넣기에서 409 가 오면 `get_page_menu_places` 로 바뀐 메뉴를 다시 보고, 빼기는 스스로 세 번까지 다시 해 봅니다.

---

## 3. 이 도구가 하지 않는 일

- **게시·숨김·되돌리기** — 게시 도구가 없습니다. 판매자가 관리자 편집기에서 합니다
- **페이지 지우기·이름/주소 바꾸기**, 메뉴 순서 바꾸기 · 3단 자리에 넣기(관리자 메뉴 관리에서)
- **코드 블록이 아닌 블록 고치기·빼기**, 페이지 문서 통째로 쓰기
- **메인 홈 블록 편집**

`X-Bootpay-Client: mcp/<AI 도구 이름>` 머리글은 편집기에서 "누가 썼는지" 표시에만 쓰입니다. 권한은 로그인·메뉴 권한·결제 가맹으로만 정해집니다.

---

## 4. 자주 보는 안내

| 상황 | 안내 |
|------|------|
| 결제 가맹 전 | 코드 블록은 부트페이 결제 가맹을 마친 쇼핑몰에서 쓸 수 있어요 |
| 기능 준비 중 | 지금은 코드 블록을 쓸 수 없어요(준비 중) |
| 409 | 관리자 화면에서 먼저 고친 내용이 있어요 — `get_mall_page` 후 다시 |
| 너무 김 | HTML 과 CSS 를 합쳐 100KB 안으로 줄여 주세요 |
| 5개 넘음 | 있는 코드 블록을 고치거나 하나로 합쳐 주세요 |
| 남는 내용 없음 | 빠지는 것만 들어 있었어요 — 보일 글이나 올린 사진을 넣어 주세요 |
| 주소 오류 | 형식·예약 주소·다른 페이지가 쓰는 주소 — 서버가 쓸 수 있는 주소를 추천해 줍니다 |
| 401 | `browser_login` 으로 다시 로그인한 뒤 같은 쇼핑몰에서 다시 시도 |
| 메뉴 409 | 그사이 관리자 화면에서 헤더 메뉴를 바꿨어요 — `get_page_menu_places` 로 다시 보고 다시 시도 |
| 메뉴 한도 | 1단 12개 · 한 항목 아래 30개 · 모두 200개 — 다른 자리를 고르거나 관리자 메뉴 관리에서 줄이기 |
| 메뉴 권한 | 헤더 메뉴는 쇼핑몰 편집 권한이 있는 계정만 바꿀 수 있어요 |
