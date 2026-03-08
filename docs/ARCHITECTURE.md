
# LeafWise Architecture Overview

This document provides a high-level overview of the LeafWise application's architecture.

## Frontend

*   **Framework**: Next.js (App Router) with **static export** (`output: 'export'` in `next.config.ts`)
*   **Language**: TypeScript
*   **UI Library**: ShadCN UI (built on Radix UI and Tailwind CSS)
*   **Styling**: Tailwind CSS
*   **AWS Integration**: **AWS SDK v3** directly (no Amplify browser SDKs) — see service files in `src/lib/`
*   **GraphQL**: Apollo Client for AppSync; typed operations via `TypedDocumentNode` in `src/lib/graphql/operations.ts`
*   **State Management**:
    *   React Context API (for global state like Auth, Language, Plant Data, Progress)
    *   Local component state (`useState`, `useEffect`) for UI-specific logic.
*   **Forms**: React Hook Form with Zod for validation.
*   **Date Management**: `date-fns`
*   **Client-Side Routing**: Handled by Next.js App Router. All pages are pre-rendered at build time and served as static HTML/JS from S3 + CloudFront.

## Generative AI Integration

*   **Toolkit**: Genkit
*   **AI Models**: Google Gemini (via `@genkit-ai/googleai` plugin)
*   **Functionality**:
    *   Plant Diagnosis (identification, health assessment, initial care tips)
    *   Detailed Care Plan Generation
    *   Health Comparison between diagnoses
    *   Care Plan Review and Update Suggestions
    *   Proactive Care Plan Review
*   **Runtime**: AI flows run on an **AWS Lambda** function with a **Function URL**, deployed alongside the Amplify backend. The static-exported Next.js frontend calls flows over HTTP.

### AI Flows Architecture

```
Browser ──HTTP POST──▶ Lambda Function URL (/api/ai/{flowName})
                          │
                          ├─ JWT validation (aws-jwt-verify, Cognito ID token)
                          ├─ Route to flow function
                          └─ Genkit + Gemini execution
```

**Key files:**

| Location | Purpose |
|----------|---------|
| `amplify/functions/ai-flows/handler.ts` | Lambda HTTP router — validates JWT, routes to flow |
| `amplify/functions/ai-flows/jwt-validator.ts` | Cognito JWT verification via `aws-jwt-verify` |
| `amplify/functions/ai-flows/genkit.ts` | Genkit initialization (googleAI plugin, Gemini 2.0 Flash) |
| `amplify/functions/ai-flows/flows/` | All flow implementations (6 files) |
| `amplify/functions/ai-flows/resource.ts` | Amplify `defineFunction` — 300s timeout, 1 GB RAM, `GOOGLE_API_KEY` secret |
| `amplify/functions/ai-flows/dev-server.ts` | Local HTTP dev server (port 4100) mirroring Lambda API |
| `src/lib/aiClient.ts` | Frontend HTTP client with typed wrappers for each flow |

**Local development:** Run `npm run ai:dev` to start the local AI server on port 4100, then `npm run dev` for the Next.js frontend. Set `NEXT_PUBLIC_AI_API_URL=http://localhost:4100` in `.env.local`.

**Secrets:** `GOOGLE_API_KEY` is provided as an Amplify secret (set via `npx ampx sandbox secret set GOOGLE_API_KEY`). `COGNITO_USER_POOL_ID` is injected automatically by the CDK stack.

## Backend & Data Storage

*   **Backend Infrastructure**: **AWS Amplify Gen 2** (`amplify/` folder, `npx ampx`) provisions and manages backend resources (Cognito, AppSync, S3, Lambda). No Amplify browser SDKs are used — the frontend communicates with these services using **AWS SDK v3** and **Apollo Client** directly.
*   **Authentication**: Cognito user pools managed by Amplify Auth. The frontend uses `@aws-sdk/client-cognito-identity-provider` for sign-up, login, and token management (`AuthContext`). Tokens are stored in `localStorage` and auto-refreshed 5 minutes before expiry. A `cognito_id_token` cookie is set for dev-mode middleware route protection.
*   **Data (GraphQL)**: Apollo Client communicates with AppSync (`src/lib/apolloClient.ts`). All GraphQL operations are defined as `TypedDocumentNode` in `src/lib/graphql/operations.ts`. Components use Apollo's `useQuery` and `useMutation` hooks. `PlantDataContext` provides centralized CRUD for plants, photos, and care tasks.
*   **Images**: Uploaded photos and avatars are stored in S3 using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (`src/lib/s3Utils.ts`). Database records store S3 keys; presigned URLs are generated at read time via `useS3Image` hook.
*   **Import/Export**: The Profile page supports exporting all plant data, including embedded image data (as Data URLs), to a self-contained JSON file. During import, this embedded image data is re-uploaded to S3, generating new S3 keys for the restored `PlantPhoto` records. This ensures a complete backup and restoration of user data, including images, independent of original S3 keys.
*   **Offline**: The application still functions offline for cached pages and will queue network requests when possible, but data primarily resides in the backend.

### Key Frontend Service Files

| File | Role |
|------|------|
| `src/lib/awsConfig.ts` | Centralized env-var loading; provides `getCognitoConfig()`, `getAppSyncConfig()`, `getS3Config()` |
| `src/lib/apolloClient.ts` | Apollo Client with Cognito auth header injection (raw JWT, no Bearer prefix) |
| `src/lib/s3Utils.ts` | `uploadFile()`, `deleteFile()`, `deleteMultipleFiles()` using Cognito Identity credentials |
| `src/hooks/useS3Image.ts` | Generates short-lived presigned URLs for S3 images |
| `src/lib/serverClient.ts` | Re-exports `createServerApolloClient()` — available for build-time data fetching (not used at runtime in static export) |

### Route Protection

*   `src/middleware.ts` enforces authentication-based access rules using the `cognito_id_token` cookie.
*   `src/lib/auth/routes.ts` defines protected/public routes and redirect logic.
*   **Note**: Next.js middleware runs during `next dev` and at build time, but does **not** run in the deployed static site (S3 + CloudFront). In production, route protection relies on API-level authorization (AppSync owner rules, Cognito tokens) and client-side auth state in `AuthContext`.

## Progressive Web App (PWA)

*   **Plugin**: `@ducanh2912/next-pwa`
*   **Features**:
    *   Installability (Add to Home Screen)
    *   Offline support (via service worker caching of app shell and assets). The service worker is registered client-side, typically within the main layout component like `ClientLayoutProvidersAndContent.tsx`.
    *   Responsiveness
    *   App Manifest (dynamically generated from `src/app/manifest.ts`)
    *   Service Worker (custom file at `public/sw.js` with Workbox injection) for caching and push notifications.
    *   App Shortcuts
    *   Push Notifications (client-side mechanism for showing notifications via service worker)
    *   Web Badging API (demonstration)

## Internationalization (i18n)

*   **Mechanism**: React Context API (`LanguageContext`)
*   **Languages Supported**: English (en), Vietnamese (vi)
*   **Storage**: Selected language preference is stored in `localStorage`.
*   **Implementation**: Static UI text is translated using JSON files (`src/locales/en.json`, `src/locales/vi.json`). AI-generated content is requested in the selected language. Date formatting adapts to the selected locale.

## Deployment (S3 + CloudFront)

The frontend is statically exported and deployed to **Amazon S3 + CloudFront** (not Amplify Hosting).

```
npm run build  →  out/  →  S3 bucket  →  CloudFront CDN
```

*   **Build**: `next build` with `output: 'export'` generates a fully static site in `out/`.
*   **Upload**: `aws s3 sync out s3://<BUCKET> --delete` pushes assets to S3.
*   **CDN**: CloudFront serves the site globally. Custom error response (404 → `/index.html`, status 200) enables client-side SPA routing.
*   **CI/CD**: `amplify.yml` orchestrates both backend deployment (`npx ampx pipeline-deploy`) and frontend upload (`aws s3 sync` + `cloudfront create-invalidation`).

### Why S3 + CloudFront (not Amplify Hosting)

*   Full control over caching, headers, and distribution
*   No dependency on Amplify Hosting or SSR runtime
*   Tree-shakeable AWS SDK v3 bundles keep the client lightweight
*   Backend (Cognito, AppSync, S3, Lambda) is still managed by Amplify Gen 2

## Future Enhancements

*   **Client-Side Route Guards**: Add `AuthContext`-based redirect logic on protected pages so production static sites enforce auth without middleware.
*   **Advanced Backend Features**: The Amplify backend can be extended with custom functions, additional authorization rules and scheduled tasks.
*   **Analytics & Monitoring**: Integrate usage analytics and error monitoring.
*   **Server-Driven Notifications**: Explore push notifications and background jobs for reminders.
