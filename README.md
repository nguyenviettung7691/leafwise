# LeafWise

LeafWise is a plant care application built with Next.js and TypeScript. It integrates **AWS** services via the modular **AWS SDK v3** (Cognito, AppSync, S3) and uses **Genkit** with Google's Gemini models for plant health analysis and care plan generation. Backend infrastructure is provisioned with **Amplify Gen 2 (ampx)**, but no Amplify browser SDKs are used.

![Screenshot](/public/screenshot-1.png)

![Screenshot](/public/screenshot-3.png)

## Features

- **User accounts** powered by AWS Cognito (register, log in, profile updates).
- **Plant management** with images stored on Amazon S3.
- **AI plant diagnosis** and **care plan generation** via Genkit flows.
- **Detailed plant pages** showing growth photos, health trends and editable care tasks.
- **Calendar view** of upcoming care tasks.
- **Data Import/Export**: Comprehensive backup and restoration of all user data, including plant details, care tasks, and embedded image data.
- **Internationalization** with English and Vietnamese translations.
- **PWA** capabilities including offline support and installability.

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- AWS Amplify Gen 2 (backend infrastructure: `auth`, `data`, `storage`)
- AWS SDK v3 (Cognito Identity Provider, S3, S3 presigner)
- Genkit with Google Gemini models
- Apollo Client for AppSync (GraphQL with auth header injection)
- ShadCN UI and Tailwind CSS
- React Context API and React Hook Form
- Framer Motion, date-fns

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` (Next.js dev) and `.env` (ampx) with required variables:
   ```env
   GOOGLE_API_KEY=YOUR_GOOGLE_AI_API_KEY

   # AWS Cognito
   REACT_APP_COGNITO_REGION=us-east-1
   REACT_APP_COGNITO_USER_POOL_ID=us-east-1_xxxxx
   REACT_APP_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
   REACT_APP_COGNITO_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

   # AWS AppSync
   REACT_APP_APPSYNC_ENDPOINT=https://xxx.appsync-api.us-east-1.amazonaws.com/graphql

   # Amazon S3
   REACT_APP_S3_BUCKET_NAME=leafwise
   REACT_APP_S3_REGION=us-east-1
   ```
   See `.env.example` for reference. All variables are required.
3. Start the Next.js dev server:
   ```bash
   npm run dev
   ```

### Amplify Backend Development

This repo uses Amplify Gen 2 with the `ampx` CLI. No global Amplify CLI install is required — use `npx ampx` for backend-only tasks. Frontend uses AWS SDK v3 directly; no Amplify browser SDKs or Hosting.

To work with the AWS Amplify backend (e.g., modify data models, authentication rules, or storage configurations), set up your AWS environment:

1.  **Configure AWS Credentials**: Ensure you have AWS credentials configured on your machine. If using AWS SSO, run:
    ```bash
    aws configure sso
    aws sso login
    ```
    Alternatively, you can use the provided npm script:
    ```bash
    npm run aws:login # This will prompt you to log in via AWS SSO.
    ```
2.  **Run the Amplify Sandbox (Gen 2)**: To initialize your cloud sandbox backend environment, run:
    ```bash
    npm run aws:sandbox
    ```
    This command deploys your backend infrastructure (Cognito, AppSync, S3) to AWS. Configuration is loaded from environment variables (see step 2 above).

3.  **(Optional)** Run Genkit flows in a separate terminal for AI features:
   ```bash
   npm run genkit:dev
   ```

#### Amplify Console Configuration (CI/CD)

- Set environment variables in Amplify Console (not from `.env.local`):
   - All required build-time vars: `GOOGLE_API_KEY`, `REACT_APP_COGNITO_REGION`, `REACT_APP_COGNITO_USER_POOL_ID`, `REACT_APP_COGNITO_CLIENT_ID`, `REACT_APP_COGNITO_IDENTITY_POOL_ID`, `REACT_APP_APPSYNC_ENDPOINT`, `REACT_APP_S3_BUCKET_NAME`, `REACT_APP_S3_REGION`
   - Deployment vars: `S3_BUCKET_NAME` (target static site bucket), `CF_DIST_ID` (CloudFront distribution ID)
- The Amplify build runs:
   - `npx ampx pipeline-deploy` (backend)
   - Next.js static export
   - `aws s3 sync` to your bucket and `cloudfront create-invalidation`

## Architecture Notes

**AWS Configuration**: The application uses environment variables for all AWS service endpoints and credentials:

- `src/lib/awsConfig.ts` centralizes configuration loading and validation
- No `amplify_outputs.json` dependency for frontend code
- Backend infrastructure managed by Amplify Gen 2 (`amplify/` folder) driven via `npx ampx`

**Authentication**: Direct AWS SDK v3 + Cognito (no Amplify Auth wrapper):

- `src/contexts/AuthContext.tsx` handles login, register, confirm signup, token refresh, and sets a `cognito_id_token` cookie for server GraphQL
- Tokens stored in localStorage with automatic refresh 5 minutes before expiry
- Client GraphQL uses Apollo auth link; server GraphQL reads ID token from cookie

**Route Protection**:
- `src/middleware.ts` enforces access rules using the `cognito_id_token` cookie
- `src/lib/auth/routes.ts` defines protected/public routes and redirect logic

**Data**: Apollo Client for AppSync GraphQL queries (no Amplify Data wrapper):

- `src/lib/apolloClient.ts` configures Apollo Client with auth header injection
- `src/lib/serverClient.ts` exports `createServerApolloClient()` for server components and route handlers (create per-request clients)
- `src/lib/graphql/operations.ts` defines all GraphQL queries and mutations
- Components use Apollo's `useQuery` and `useMutation` hooks for data operations

Server usage example:

```ts
// In a server component or route handler
import { createServerApolloClient } from '@/lib/serverClient';

export async function getData() {
   const client = await createServerApolloClient();
   const { data } = await client.query({ /* ... */ });
   return data;
}
```
Notes:
- AppSync (Cognito User Pools) expects the raw JWT (no Bearer) in `Authorization`.
- `cognito_id_token` cookie (set by the client) is read server-side for auth.

**Why AWS SDK v3 (Browser)**
- Modular and tree-shakeable bundles
- Direct control over auth headers and credentials
- Works cleanly with S3 + CloudFront static hosting (no Amplify Hosting dependency)

**Storage**: AWS SDK v3 S3 (no Amplify Storage wrapper):

- `src/lib/s3Utils.ts` provides `uploadFile()`, `deleteFile()`, and `deleteMultipleFiles()` utilities
- `src/hooks/useS3Image.ts` generates short-lived signed URLs for secure image access
- Uploads/deletes use Cognito Identity credentials acquired at runtime; browser-safe SigV4 signing

After copying these files, run:

``` bash
npm install
npm run typecheck
npm run build
```

This ensures all types are correct and the code compiles properly.

## Repository Layout

- `amplify/` – Amplify backend definitions for auth, data and storage.
- `src/app/` – Next.js route handlers and pages.
- `src/components/` – Reusable React components.
- `src/ai/` – Genkit flows for diagnosis and care plan logic.
- `src/contexts/` – React context providers (auth, language, plant data, etc.).
- `src/hooks/` – Custom hooks including utilities for S3 images and PWA state.
- `src/lib/` – Shared utilities and service clients (awsConfig, apolloClient, serverClient).
- `public/` – Static assets and service worker.

## Deployment (S3 + CloudFront)

- Build static export (configured via `next.config.ts` `output: 'export'`):
   ```bash
   npm run build
   # output in ./out
   ```
- Upload to S3 and invalidate CloudFront (manual):
   ```bash
   aws s3 sync out s3://<YOUR_S3_BUCKET> --delete
   aws cloudfront create-invalidation --distribution-id <YOUR_CF_DIST_ID> --paths "/*"
   ```
- CI/CD (optional): `amplify.yml` runs:
   - `npx ampx pipeline-deploy` for backend infra
   - `npx ampx generate outputs` (if needed for ops)
   - `aws s3 sync` and `cloudfront create-invalidation` for frontend

Environment variables for CI/CD (set in your build environment, not `.env.local`):
- `S3_BUCKET_NAME`: Target S3 bucket for the static site
- `CF_DIST_ID`: CloudFront distribution ID for invalidation

CloudFront + S3 prerequisites (one-time, via AWS Console):
- S3 bucket: enable versioning, block all public access
- CloudFront distribution: set S3 bucket as origin with OAI; default root object `index.html`
- SPA routing: custom error response 404 → `/index.html` with response code 200
- Optional: attach custom domain + ACM certificate; add DNS CNAME to CloudFront domain

Note: Remove any Amplify Hosting rewrites; SPA routing is handled by CloudFront’s custom error response.

### Sandbox Cleanup

- Delete the current Amplify sandbox deployment:
   ```bash
   npx ampx sandbox delete
   ```
- VS Code task: `delete-amplify-sandbox` (Terminal → Run Task) to run the same command.
