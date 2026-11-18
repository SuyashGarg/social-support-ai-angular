# Social Support AI — Angular 18

A separate Angular implementation of [SuyashGarg/social-support-ai](https://github.com/SuyashGarg/social-support-ai), 

## Run locally

Use Node.js 22.12+ (Node 22 LTS recommended) and npm.

```sh
npm ci
cp .env.example .env
# Set OPENAI_API_KEY in .env on your machine, never in browser code.
npm start
```

Open http://localhost:4200. Angular proxies `/api` to the Express server at port 3001. Set `OPENAI_MODEL` to change the default `gpt-4o-mini` model. Without a key, the form works and AI requests show a configuration failure. No fake AI results are used.

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
npm run start:production
```

The production server serves both the Angular build and API on port 3001. Browser tests use Playwright-managed Chromium by default. Run `npx playwright install chromium` once to install it. To use an existing browser instead, set `PLAYWRIGHT_EXECUTABLE_PATH` to its executable path. Deploy behind HTTPS. For a public deployment, add your organization's authentication and shared rate-limit store; the included per-IP limiter is in memory.

## Migration

- Angular 18 standalone components, Angular Router, strict TypeScript and strict templates.
- Writable `signal()` state for draft, errors, language, history, loading, and editable AI suggestions. `computed()` derives the current step, direction and selected history result. `effect()` persists browser state and updates document language/direction.
- Original form schema, fields, English/Arabic translations and logo reused. Three steps, validation, guarded deep links, back/forward navigation, history and detail views.
- AI assistance sends only the entered description, field label and language to the backend. Suggestions can be edited, accepted or discarded. No identity/contact fields are sent automatically.
- Session storage uses new `ss-angular-*` keys and never touches the React application's storage. Draft and history remain in the current browser session; no remote submission service or database is implied.
- Country selection and dependent state lists are provided; address and city can be entered manually. Google Places autocomplete from React is not included; no Google Maps key is required.

## Validation

API tests cover input/method validation, missing keys, Arabic instructions, successful results and provider error handling. Browser tests cover validation, deep links, draft persistence, all form steps, edited AI result acceptance, review/history, Arabic direction persistence, mobile overflow and API failure recovery. Browser tests mock OpenAI to avoid costs; a live provider call requires your own key.

## Source attribution

The form schema, translations, type definitions and logo originate from the React repository linked above. The source repository contains no LICENSE file at the referenced commit; no new license is asserted for those materials.
