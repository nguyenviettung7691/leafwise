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
- AWS Amplify Gen 2 (`auth`, `data`, `storage`)
- Genkit with Google Gemini models
- ShadCN UI and Tailwind CSS
- React Context API and React Hook Form
- Framer Motion, date-fns

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file and set your Google API key:
   ```env
   GOOGLE_API_KEY=YOUR_GOOGLE_AI_API_KEY
   ```
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
    **Important**: This command generates the `amplify_outputs.json` file at the root of the repository. This file is required for the application to connect to your AWS backend resources and is git-ignored. Without it, modules like `src/lib/serverClient.ts` will fail to import the configuration.

4.  **(Optional)** Run Genkit flows in a separate terminal for AI features:
   ```bash
   npm run genkit:dev
   ```


## Repository Layout

- `amplify/` – Amplify backend definitions for auth, data and storage.
- `src/app/` – Next.js route handlers and pages.
- `src/components/` – Reusable React components.
- `src/ai/` – Genkit flows for diagnosis and care plan logic.
- `src/contexts/` – React context providers (auth, language, plant data, etc.).
- `src/hooks/` – Custom hooks including utilities for S3 images and PWA state.
- `public/` – Static assets and service worker.
