# Keneth Global — E-commerce PRD

## Original problem statement
A modern e-commerce website for Keneth Global — an Indian company exporting to Europe. Deals in home decor (decorative cloth), Indian spices ("masalas"), and (added later) artificial jewelry. Website must be multi-language (English + EU languages) and "very beautiful". Full e-commerce with cart + Stripe checkout + admin panel + AI-generated product photography.

## User personas
- **European home-goods shopper** — buys premium spices, textiles, artisan jewelry as gifts / for their own home.
- **Storefront admin** — Keneth Global staff managing products, orders, image regeneration.

## Architecture
- **Frontend**: React 19 + Tailwind + Shadcn UI, react-router-dom v7, sonner for toasts, Cormorant Garamond + Outfit fonts, dark cinematic editorial theme (ink-900 + brass-400 gold accent).
- **Backend**: FastAPI + Motor async MongoDB. JWT (7d) + bcrypt password hashing. All routes under `/api`.
- **Payments**: Stripe via `emergentintegrations` (Flow B — India country not SMP-eligible; using `STRIPE_API_KEY=sk_test_emergent`). Webhook at `/api/webhook/stripe`.
- **AI images**: Gemini Nano Banana (`gemini-3.1-flash-image-preview`) via `emergentintegrations` LlmChat + Emergent LLM key. Auto-generates hero images for all seed products on startup, saved to `/app/backend/static/products/` and served via `/api/static/*`.
- **i18n**: In-memory JS dictionary for EN / DE / FR / ES / IT (5 languages).

## Verticals (3)
1. **Indian Spices** (6 products) — Garam Masala, Kashmiri Chilli, Turmeric Gold, Green Cardamom, Biryani Masala, Chai Masala.
2. **Home Decor** (6 products) — Bedsheet, Cushion Covers, Table Runner, Wall Hanging, Pillow Covers, Dining Sheet.
3. **Artificial Jewelry** (5 products) — Kundan Choker Set, Polki Jhumka Earrings, Meenakari Bangles, Temple Long Haram, Oxidised Ring Stack.

## What's been implemented (2026-02)
- Full storefront: Home → Shop → Product Detail → Cart → Checkout (Stripe) → Success/Cancel → Account/Orders
- JWT auth with admin seeding (admin@kenethglobal.com / Admin@Keneth2026)
- Admin panel with stats (revenue, orders, products, users), products list w/ regenerate-image, orders list, customer list
- 17 AI-generated luxury product photos via Nano Banana
- Multi-language switcher in header — EN/DE/FR/ES/IT
- Custom SVG monogram logo ("K" as woven wheat stem + fabric ribbon) — used in header, footer, favicon
- Responsive layout with mobile menu, mobile-first grid, marquee announcement bar, glass sticky header
- Cart persistence via localStorage; Stripe test card 4242…
- 22/22 backend pytest suite passing

## Prioritized backlog
- **P1 · Wishlist / saved items** — currently no wishlist feature
- **P1 · Product image gallery** — currently one image per product; multi-image gallery with thumbnails
- **P1 · Search bar in header** — no search UI yet (backend `/api/products?q=` exists)
- **P2 · Product reviews & ratings**
- **P2 · Blog / journal section** ("Craftsmanship" stories)
- **P2 · Newsletter integration** (currently visual only — needs email capture backend)
- **P2 · About / Contact / Shipping / Returns pages** (currently footer links go to placeholders)
- **P2 · Guest checkout email capture** — currently email only if logged in
- **P3 · Product variants** (size / color for textiles)
- **P3 · Wishlist → order gift note**
- **P3 · Better mobile search UX**

## Known limitations
- Stripe using shared test key `sk_test_emergent` — user can swap for real key in `.env` when going live. Because Keneth Global is India-based, Flow A claimable sandbox is not available (Stripe doesn't support IN merchants directly).
- Newsletter form is visual only.
- Footer links (About / Craftsmanship / Contact) are placeholders; no dedicated pages yet.

## Deployment (2026-06)
- Delivered archive `noida-ecom-main.zip` merged into /app (backend + frontend + 48 curated PNGs).
- Env configured in backend/.env: MONGO_URL, DB_NAME (local preview), JWT_SECRET (strong), STRIPE_API_KEY=sk_test_emergent, EMERGENT_LLM_KEY, ADMIN_EMAIL/PASSWORD, CORS_ORIGINS restricted to frontend domain.
- Startup now runs reconcile_static_images() to reuse the 48 bundled PNGs (products + journal covers) instead of regenerating via LLM (zero LLM spend); auto-gen only fills genuinely missing images.
- Added GET /api/health (DB ping).
- Verified: 28/28 backend pytest pass; frontend E2E (home, shop, product, cart->Stripe redirect, admin dashboard, language switch) pass; deployment_agent readiness = PASS.
- Go-live TODO: swap Stripe test key for a live key; consider Atlas managed DB + backups for real production.

## Deployment prep (2026-06)
- App imported from `noida-ecom-main.zip` into live workspace; running clean (backend healthy, 17 products seeded, bundled static images serve over HTTPS).
- Env wired: JWT_SECRET (rotated/strong), STRIPE_API_KEY=sk_test_emergent (TEST mode), EMERGENT_LLM_KEY, ADMIN_EMAIL/PASSWORD, CORS_ORIGINS locked to frontend domain (no "*").
- Backend verified: 42/42 pytest pass — auth boundaries, server-side Stripe amount calc, admin RBAC, webhook signature rejection, order flow all confirmed. Deployment-readiness scan: PASS.
- Homepage readability pass: lifted near-black (#0A0A09) base to warmer charcoal (#14120E), brightened bone text palette + muted tokens, strengthened hero/vertical-card overlays with text-shadow, fixed faint marquee/nav text.
- Still in TEST payment mode — switch to live Stripe keys only after an end-to-end order on the deployed URL (Phase 5).

## Homepage restructure (2026-06)
- New section order: Hero → About Us (new) → Three Houses → Featured this season (now includes spices) → Category showcases (new: Indian Spices, Artificial Jewelry, Home Decor; Christmas Decor auto-renders only when products exist) → Testimonials (new) → Press logos → Newsletter → Footer.
- Fixed Featured bucketing (was using stale vertical keys home-decor/jewelry; now masalas/home-furnishing/artificial-jewelry).
- Testimonials + About copy are static English (not yet in i18n dictionary).

## Christmas products added (2026-06)
- Seeded 4 christmas-decor products (total catalog 17 -> 21): christmas-beaded-ornament-set (€34, Festive), christmas-embroidered-stocking (€26, Handcrafted), christmas-zari-table-runner (€42), christmas-star-tree-topper (€38, Limited). Full 5-language names/descriptions + AI image_prompt + Unsplash image_hint fallback.
- Homepage "Christmas Decor" category showcase now renders automatically; AI images generated via Nano Banana on startup and served from /api/static.

## Seasonal + gifting features (2026-06)
- Christmas landing page at /christmas: free-shipping banner, festive hero, Christmas collection grid + gift guide (Under €30 / Statement gifts / For the host, derived from live catalog). Header/mobile nav "Christmas Decor" -> /christmas.
- Gift wrap at checkout: Cart toggle (+€5) with optional 500-char handwritten note. Backend CheckoutIn accepts gift_wrap + gift_message; €5 fee added server-side to order total and persisted on order doc (gift_wrap, gift_message) + Stripe metadata. Verified: 8.90 -> 13.90.
- i18n: added home.about.*, home.testi.* (translated quotes), home.house.*, home.shopAll/viewAll, cart.giftwrap.*, xmas.* keys to all 5 languages (en/de/fr/es/it). Home About + testimonials + category titles now fully localized (DE verified live).

## Gift preview, countdown & B2B (2026-06)
- Cart gift-wrap now shows a generated preview photo (/frontend/public/gift-wrap.jpg).
- Christmas page: live countdown "N days until Christmas" + order-by-20-Dec line (localized, /christmas).
- Product page B2B: retail (Add to Cart / Buy Now) PLUS "Business / Bulk Order" button -> modal capturing name, phone, quantity (+optional email/message). POST /api/product/enquiry (stored in bulk_enquiries, requires name+phone+quantity). Admin list: GET /api/admin/bulk-enquiries. All B2B + countdown copy translated in en/de/fr/es/it.
- PENDING: Order-confirmation email needs a provider (SendGrid/Resend/Gmail) + API key from user. Deploy is a user-triggered button (app already deploy-ready).

## Deployment import & hardening (2026-06, this workspace)
- Imported `noidaEcom2-main.zip` (Keneth Global store) into /app; preserved workspace .git/.emergent/.env protected vars.
- backend/.env reconstructed (was gitignored): MONGO_URL/DB_NAME (platform Mongo), strong JWT_SECRET, STRIPE_API_KEY=sk_test_emergent, EMERGENT_LLM_KEY, ADMIN creds, CORS_ORIGINS.
- Secrets audit: NO hardcoded keys/URIs in source; frontend uses REACT_APP_BACKEND_URL only; backend reads all config from env.
- Hardening: pinned Stripe webhook_url to server-side PUBLIC_BASE_URL env (falls back to runtime request origin so it works across preview/prod domains). handle_webhook verifies Stripe signature server-side.
- CORS: platform managed-deploy requires CORS_ORIGINS="*" (prod domain differs: {app}.emergent.host + custom domains). Safe here — auth uses Bearer tokens in localStorage, not cookies; frontend+API same-origin behind ingress.
- Verified: /api/health db ok; 21 products seeded; admin login; static PNGs serve 200; Stripe checkout session -> checkout.stripe.com; SPA deep-links no 404; 42/42 backend pytest; deployment_agent readiness = PASS.
- Known non-blocking (product decisions, not deploy bugs): EN visitors see INR-converted prices by design (lib/currency.js); top marquee strings are English-only (not routed through i18n).
- Go-live TODO: swap sk_test_emergent for a live Stripe key; the app then works on the assigned emergent.host domain automatically.
