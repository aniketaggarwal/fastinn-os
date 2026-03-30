<!-- Copilot instructions for the Bit‑Wizardz repo -->
# Copilot guidance — Bit‑Wizardz

This file gives concise, project-specific guidance so AI coding agents (Copilot-like) can be immediately productive.

1) Big picture
- **Framework:** Next.js app using the `app/` router under `src/app` (see `src/app/page.tsx`, `src/app/layout.tsx`).
- **Client-side ML:** Face recognition runs entirely in the browser via `face-api.js`. Models must live in `public/models` (helper script: `download-models.js`).
- **Backend/storage:** The app talks to Supabase using `src/lib/supabase.ts` and environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Service layer:** `src/lib/*` holds reusable services (face, ocr, storage, encryption). Treat these as the primary integration points.

2) Important files to read first
- `package.json` — scripts (`dev`, `build`, `start`, `lint`) and dependencies.
- `src/app/page.tsx` — entry UI and routing examples.
- `src/lib/` — `face-service.ts`, `supabase.ts`, `ocr-verification.ts`, `storage.ts` (core logic and third-party integrations).
- `src/components/FaceScanner.tsx` and `src/components/CameraFeed.jsx` — examples of camera & face-api usage.
- `download-models.js` — how to populate `public/models` with face-api weights.
- `supabase_schema_update.sql` and other `.sql` files — database schema changes used with Supabase.

3) Workflows & commands (how to run & debug)
- Start dev server: `npm run dev` (project uses Next.js; dev server runs on port 3000).
- Build: `npm run build` then `npm run start` to serve the production build.
- Lint: `npm run lint` (ESLint configured).
- Download ML models (required for face features):
  - `node download-models.js` — saves weights to `public/models`.
- Environment: create `.env.local` in the repo root with at least:
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

4) Project-specific conventions & patterns
- **Service layer in `src/lib/`**: Prefer adding new cross-cutting logic here (e.g., new API wrappers, storage helpers). UI components should call `lib` functions rather than embedding network/storage logic.
- **Client ML models location:** Hard-coded model path is `'/models'` (see `src/lib/face-service.ts`); never change this without updating model-loading code.
- **Mixed file types:** The codebase contains `.tsx`, `.ts`, `.jsx` files. Follow the existing file extension for the component you modify.
- **UI routing:** Uses Next `app/` router under `src/app` — pages are `page.tsx` files inside route folders (e.g., `src/app/login`, `src/app/checkin`).

5) Integration & dependencies to be careful with
- `face-api.js` (weights in `public/models`) — large binary assets; use `download-models.js` when missing.
- `tesseract.js` — used for OCR; check `src/lib/ocr-verification.ts` for usage patterns and threading concerns.
- `@supabase/supabase-js` — serverless DB operations via client; check `src/lib/supabase.ts` and SQL files for schema expectations.

6) When making changes, look for these patterns
- If you add a page under `src/app`, include a `page.tsx` and, when needed, a `layout.tsx` in the route folder.
- For camera/face features, prefer reusing `src/components/FaceScanner.tsx` and `src/hooks/useFaceApi.ts` rather than duplicating camera logic.
- Add unitable logic in `src/lib/` to keep components thin; this repository has minimal automated tests — include small integration checks where possible.

7) Examples to reference in PRs
- Add a change that updates face loading: reference `src/lib/face-service.ts` and `download-models.js` to explain model path and download step.
- Add Supabase schema changes: include `.sql` files and note runtime env vars in `.env.local`.

8) Do not assume
- There is no test runner configured — do not add tests requiring a specific test framework without updating `package.json` scripts.
- CI is not present in the repo — avoid referencing CI config unless you add it.

If anything above is unclear or you'd like additional detail (example PR templates, suggested tests, or a minimal local debug guide), tell me which parts to expand and I will iterate.
