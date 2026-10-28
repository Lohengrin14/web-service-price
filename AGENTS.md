# AGENTS.md

Guidance for AI coding agents working on this repository.

## Project

`parts-search` is a client app for the Favorit Autoparts price/analogues API
(docs: https://lk.favorit-parts.ru/static/wsprice.pdf). It is a test assignment;
the guiding principle is **the simpler, the better**.

- Step 1: the user types a part number → request by `number` → list of brands that make it → user picks one.
- Step 2: request by `number` + `brand` + `analogues=on` → table of the part and its analogues.
  Every row must show name/brand, price and stock.
- Loading states and API errors (empty results, network failures, API `error` field) must be handled.

## Communication and language

- Talk to the user in **Russian**.
- UI text and code comments are in **Russian**.
- **Git commit messages, branch names and PR titles/descriptions are in English**, Conventional Commits
  style (`feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `test:`, `ci:`), e.g. `feat: add offer filters and sorting`.

## Stack and hard constraints

- Vite 8, React 19, Redux Toolkit 2, react-redux 9, Bootstrap 5.3 (CSS classes only), Vitest, Oxlint.
- Node 20.19+ or 22.12+.
- **No TypeScript. No extra libraries** (no React-Bootstrap, axios, router, UI kits, etc.) without explicit approval.
- Keep the current architecture. Discuss any large refactor with the user before doing it.
- Match the style of surrounding code: naming, comment density, small focused components.

## Security: the API key

- The key must **never** reach git or client code. Never create a `VITE_*` variable containing the key.
- The key lives only in server-side env: `FAVORIT_API_KEY` in `.env.local` (dev/preview) or in the
  hosting function's environment (production).
- `.env.local` must be git-ignored; `.env.example` is the committed template without a real key.
- Do not print the real key in logs, tests, fixtures or commit messages. Strip it from any captured API response.

## Architecture

```
browser → /api/search?number=&brand=&analogues=  → proxy (adds key, whitelists params) → Favorit API
```

- `vite.config.js` — dev/preview proxy. Loads only `FAVORIT_*` vars via `loadEnv` (never bundled).
  Forwards only `number`, `brand`, `analogues`; injects `key`. `FAVORIT_API_URL` overrides the target.
- Frontend API URL: `import.meta.env.VITE_API_URL || '/api/search'` (`VITE_API_URL` is a URL, never a key).
- `src/api/favorit.js` — all API knowledge lives here:
  - `requestGoods` — fetch with 15 s timeout (AbortController); handles non-JSON, HTTP errors and the
    `error` field; known API errors are translated to Russian.
  - `parseGoods` — accepts `{ goods: [...] }` or a bare array; drops empty "not found" structures.
  - `extractBrands` — step 1: unique brand+number pairs, summed `count`, sorted by brand.
  - `extractOffers` — step 2: one row per warehouse, `isOriginal` flag for the searched part,
    deduplicated analogues; order: searched part, then in-stock, then by price.
- `src/store/searchSlice.js` — state `{ number, selected: { brand, number }, brands, offers }`;
  `brands`/`offers` are `{ items, status: idle|loading|succeeded|failed, error, requestId }`.
  Thunks `fetchBrands({ number, brand? })`, `fetchOffers({ number, brand })`; successful responses are cached in memory for 5 min (saves API quota); `condition` blocks duplicate requests
  (except retry after failure); stale responses are ignored via `requestId`; `resetSearch` action.
- Step 2 is called with the `number` and `brand` **returned by step 1**, not the raw user input.
- `src/components/` — `SearchForm` (debounced auto-search 1000 ms from 3 chars, Enter = immediate,
  empty input resets), `BrandList`, `OffersTable`, `Loader`, `ErrorAlert` (with "Повторить").
- `src/utils/format.js` — `formatPrice`, `formatShipment`, `pluralize`.
- `App.jsx` — two columns (4/8) on wide screens; a single column when there are no brands or the request failed.

## Favorit API notes

- Single endpoint: `GET http://api.favorit-parts.ru/hs/hsprice/`, params `key`, `number`, `brand`,
  `analogues=on`, `info=on`.
- URL-encode special characters in `number`/`brand` (`#` → `%23`, `&` → `%26`); use `URLSearchParams`.
- Response: `{ goods: [...] }`. Item fields: `goodsID`, `brand`, `number`, `name`, `count`, `rate`,
  `analogues[]` (same shape), `warehouses[]`, `notRefund`.
- **Do not use the item-level `price`** — it is deprecated. Price and stock come from `warehouses[]`
  (`price`, `stock`, plus `code`, `id`, `own`, `shipmentDate`, `notRefund`).
- `shipmentDate` time = the order cut-off time.
- "Not found" = `goods` with one empty structure. No stock = an item with zero stock.
- Errors = a single `error` field, possibly several messages: `Empty key!`, `Invalid key client!`,
  `Empty number goods!`, `Request quota exceeded!`.
- Not used yet (add only on request): `info=on` / `notRefund`, `rate`, `own`.
- **The parser is written from the PDF only and has not been verified against the live API.**
  When live responses become available, compare them with `src/api/favorit.js`, fix the parser,
  and add sanitized real responses (no key) as test fixtures.

## Workflow

- Read the relevant files before editing; don't guess file contents.
- After changes, always run:
  ```bash
  npm run lint
  npm test
  npm run build
  ```
- Add or update tests in `src/api/favorit.test.js` / `src/utils/format.test.js` when changing parsing or formatting.
- Commit or push only when the user asks.

## Deployment plan (agreed, not done yet)

The reviewer is most likely in Russia; the site must open there without a VPN.

- Avoid Cloudflare (throttled in RU since mid-2025). Vercel/Netlify are partially blocked.
- Preferred: **GitHub Pages** (static, built by GitHub Actions, `base: '/<repo-name>/'` in `vite.config.js`)
  + **Yandex Cloud Functions** proxy (Russian IP, key in function env, CORS only for the Pages origin,
  same param whitelist). The function URL is passed at build time via `VITE_API_URL`.
- Fallback: Vercel (static + function in `/api`).
- The user does all registrations and enters keys in dashboards; the agent provides step-by-step instructions.

## Open tasks

1. Verify against the live API (e.g. number `01089`, then a brand from the response with `analogues=on`).
2. Deploy as described above.
3. Update `README.md` (Russian): demo link and deployment instructions.
