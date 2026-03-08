# LeafWise — Project Guidelines

## Code Style

- **TypeScript strict mode** — no `any` types; use explicit types from `src/types/index.ts`
- **Imports**: always use the `@/` path alias (e.g., `@/lib/awsConfig`, `@/components/ui/button`)
- **File naming**: kebab-case for files, PascalCase for components/types, camelCase for hooks/variables
- **Components**: functional components with named exports; colocate props interfaces in the same file
- **UI primitives**: use ShadCN components from `src/components/ui/` — do not add new CSS frameworks
- **Styling**: Tailwind CSS utility classes with HSL CSS variables (`hsl(var(--primary))`); no inline `style` props unless dynamic

## Architecture

### AWS SDK v3 — No Amplify Browser SDKs

The frontend uses **AWS SDK v3 directly** — never import from `aws-amplify`, `@aws-amplify/*`, or Amplify UI libraries. Backend infrastructure is Amplify Gen 2 (`amplify/` folder, `npx ampx`), but the browser code wires SDK v3 clients manually.

Key service files:

| File | Role |
|------|------|
| `src/lib/awsConfig.ts` | Centralized env-var loading; provides `getCognitoConfig()`, `getAppSyncConfig()`, `getS3Config()` |
| `src/lib/apolloClient.ts` | Apollo Client with Cognito auth header injection (raw JWT, no Bearer prefix) |
| `src/lib/serverClient.ts` | `createServerApolloClient()` for server components / route handlers — create per-request |
| `src/lib/s3Utils.ts` | `uploadFile()`, `deleteFile()`, `deleteMultipleFiles()` using Cognito Identity credentials |
| `src/hooks/useS3Image.ts` | Generates short-lived presigned URLs for S3 images |

### Authentication

- `AuthContext` manages Cognito user-pool auth (sign-up, login, token refresh)
- Tokens stored in `localStorage`; auto-refresh 5 min before expiry
- `cognito_id_token` **cookie** is set for server-side GraphQL reads
- Middleware (`src/middleware.ts`) checks the cookie for route protection — runs in Node.js edge, no browser APIs

### Data Layer

- Apollo Client for AppSync GraphQL; typed operations via `TypedDocumentNode` in `src/lib/graphql/operations.ts`
- `PlantDataContext` provides centralized CRUD for plants, photos, and care tasks with integrated S3 operations
- **S3 keys stored in DB** — presigned URLs are generated at read time, never persisted

### AI Flows (Lambda + Genkit + Gemini)

- AI flows run on an **AWS Lambda** function with a **Function URL** (`amplify/functions/ai-flows/`)
- Flow implementations are in `amplify/functions/ai-flows/flows/` — each validates I/O with Zod schemas
- Lambda handler (`handler.ts`) routes `POST /api/ai/{flowName}`, validates Cognito JWT via `aws-jwt-verify`
- Frontend calls flows via `src/lib/aiClient.ts` — typed HTTP client using `NEXT_PUBLIC_AI_API_URL`
- `GOOGLE_API_KEY` is provided as an Amplify secret; `COGNITO_USER_POOL_ID` is injected by CDK
- Flows accept a `languageCode` param (`'en'` | `'vi'`) for bilingual responses
- **Local dev**: `npm run ai:dev` starts a dev server on port 4100 (no JWT validation)

### State Management

Four React Context providers, nested in this order:
```
ThemeProvider > AuthProvider > PlantDataProvider > ProgressProvider
```
`LanguageProvider` wraps all at root level.

## Build and Test

```bash
npm run dev           # Next.js dev server (port 9002, turbopack)
npm run ai:dev        # AI flows local HTTP server (port 4100)
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run build         # Static export to ./out
npm run genkit:dev    # Genkit dev UI (flow debugging)
npm run aws:sandbox   # Deploy Amplify sandbox backend
npm run aws:login     # AWS SSO login
```

**Always run `npm run typecheck` and `npm run lint` before committing.**

## Conventions

### Forms & Validation
- React Hook Form + Zod for all forms; field-level errors via `<FormMessage>`

### Internationalization
- Custom `LanguageContext` with JSON files in `src/locales/` (`en.json`, `vi.json`)
- Usage: `const { t } = useLanguage(); t('nav.myPlants')`
- All user-facing strings must use `t()` — no hardcoded English in components

### S3 & Images
- S3 key format: `plants/{identityId}/photo-{uuid}.{ext}`
- Operations need `user.identityId` (Cognito Identity), not `user.id`

### Health Conditions
- Enum values: `'healthy'` | `'needs_attention'` | `'sick'` | `'unknown'` — use exactly these strings

### PWA
- Service worker in `public/sw.js`, manually registered in `ClientLayoutProvidersAndContent`

### Amplify Backend
- Resources defined in `amplify/` (auth, data, storage, functions)
- AI flows Lambda function in `amplify/functions/ai-flows/`
- Use `npx ampx` for all backend CLI operations — no global Amplify CLI

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed design decisions.
