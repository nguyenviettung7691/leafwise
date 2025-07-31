
# LeafWise Architecture Overview

This document provides a high-level overview of the LeafWise application's architecture as a frontend UI prototype.

## Frontend

*   **Framework**: Next.js (App Router)
*   **Language**: TypeScript
*   **UI Library**: ShadCN UI (built on Radix UI and Tailwind CSS)
*   **Styling**: Tailwind CSS
*   **State Management**:
    *   React Context API (for global state like Auth, Language, Plant Data, Progress)
    *   Local component state (`useState`, `useEffect`) for UI-specific logic.
*   **Forms**: React Hook Form with Zod for validation.
*   **Date Management**: `date-fns`
*   **Client-Side Routing**: Handled by Next.js App Router.

## Generative AI Integration

*   **Toolkit**: Genkit
*   **AI Models**: Google Gemini (via `@genkit-ai/googleai` plugin)
*   **Functionality**:
    *   Plant Diagnosis (identification, health assessment, initial care tips)
    *   Detailed Care Plan Generation
    *   Health Comparison between diagnoses
    *   Care Plan Review and Update Suggestions
*   **Implementation**: Genkit flows are defined as server-side functions (`'use server';`) within the Next.js application, callable from client components.

## Backend & Data Storage

*   **Platform**: **AWS Amplify** is used for authentication, data and file storage.
*   **Authentication**: Cognito user pools managed by Amplify Auth. All API calls are signed with the user's session token.
*   **Data**: Plant records, photos, care tasks and user preferences are defined as Amplify Data models with owner-based authorization.
*   **Images**: Uploaded photos and avatars are stored in S3 via Amplify Storage. Database records keep the S3 key for each file.
*   **Import/Export**: The Profile page supports exporting all plant data, including embedded image data (as Data URLs), to a self-contained JSON file. During import, this embedded image data is re-uploaded to S3, generating new S3 keys for the restored `PlantPhoto` records. This ensures a complete backup and restoration of user data, including images, independent of original S3 keys.
*   **Offline**: The application still functions offline for cached pages and will queue network requests when possible, but data primarily resides in the Amplify backend.

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

## Future Enhancements

*   **Advanced Backend Features**: The Amplify backend can be extended with custom functions, additional authorization rules and scheduled tasks.
*   **Analytics & Monitoring**: Integrate usage analytics and error monitoring.
*   **Server-Driven Notifications**: Explore push notifications and background jobs for reminders.
