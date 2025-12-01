# LeafWise

LeafWise is a plant care application built with Next.js and TypeScript. It integrates **AWS Amplify** for authentication, data storage and image uploads, and uses **Genkit** with Google's Gemini models for plant health analysis and care plan generation.

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
- AWS SDK v3 (client-side: Cognito, AppSync, S3)
- Genkit with Google Gemini models
- Apollo Client for AppSync GraphQL queries
- ShadCN UI and Tailwind CSS
- React Context API and React Hook Form
- Framer Motion, date-fns

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file and set your Google API key:
   ```env
   GOOGLE_API_KEY=YOUR_GOOGLE_AI_API_KEY

   # AWS Cognito
   REACT_APP_COGNITO_REGION=us-east-1
   REACT_APP_COGNITO_USER_POOL_ID=us-east-1_xxxxx
   REACT_APP_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx

   # AWS AppSync
   REACT_APP_APPSYNC_ENDPOINT=https://xxx.appsync-api.us-east-1.amazonaws.com/graphql

   # Amazon S3
   REACT_APP_S3_BUCKET_NAME=leafwise
   REACT_APP_S3_REGION=us-east-1
   ```
   See .env.example for reference.
3. Start the Next.js dev server:
   ```bash
   npm run dev
   ```

### Amplify Backend Development

To work with the AWS Amplify backend (e.g., modify data models, authentication rules, or storage configurations), you'll need to set up your AWS environment:

1.  **Install AWS Amplify CLI**:
    ```bash
    npm install -g @aws-amplify/cli
    ```
2.  **Configure AWS Credentials**: Ensure you have AWS credentials configured on your machine. If using AWS SSO, run:
    ```bash
    aws configure sso
    aws sso login
    ```
    Alternatively, you can use the provided npm script:
    ```bash
    npm run aws:login # This will prompt you to log in via AWS SSO.
    ```
3.  **Run the Amplify Sandbox**: To initialize your cloud sandbox backend environment, run:
    ```bash
    npm run aws:sandbox
    ```
    This command deploys your backend infrastructure (Cognito, AppSync, S3) to AWS. Configuration is loaded from environment variables (see step 2 above).

4.  **(Optional)** Run Genkit flows in a separate terminal for AI features:
   ```bash
   npm run genkit:dev
   ```

## Architecture Notes

**AWS Configuration**: The application uses environment variables for all AWS service endpoints and credentials:

- `src/lib/awsConfig.ts` centralizes configuration loading and validation
- No `amplify_outputs.json` dependency for frontend code
- Backend infrastructure still managed by Amplify CLI (`amplify/` folder)

**Authentication**: Direct AWS SDK v3 + Cognito (no Amplify Auth wrapper):

- `src/contexts/AuthContext.tsx` handles login, register, confirm signup, and token management
- Tokens stored in localStorage with automatic refresh 5 minutes before expiry
- ID tokens injected into AppSync requests via Apollo Client auth link

**Data**: Apollo Client for AppSync GraphQL queries (no Amplify Data wrapper):

- `src/lib/apolloClient.ts` configures Apollo Client with auth header injection
- `src/lib/serverClient.ts` re-exports for server-side usage in Server Components
- `src/lib/graphql/operations.ts` defines all GraphQL queries and mutations
- Components use Apollo's `useQuery` and `useMutation` hooks for data operations

**Storage**: AWS SDK v3 S3 (no Amplify Storage wrapper):

- `src/lib/s3Utils.ts` provides `uploadFile()`, `deleteFile()`, and `deleteMultipleFiles()` utilities
- `src/hooks/useS3Image.ts` generates signed URLs for secure image access
- Browser-safe SigV4 signing without exposing credentials

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
