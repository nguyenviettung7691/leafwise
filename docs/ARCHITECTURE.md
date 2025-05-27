
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

## Data Storage (Prototype - Client-Side)

*   **User Profiles**:
    *   Stored in **IndexedDB** (`userProfileStore` within a user-specific database, e.g., `LeafWiseDB_{userId}`). Contains name, avatar image key, and preferences.
    *   User session is indicated by a user ID in `localStorage` (`currentLeafwiseUserId`).
*   **Plant Data (metadata, care tasks)**:
    *   Stored in **`localStorage`** (key: `leafwisePlants_{userId}`). Contains an array of `Plant` objects.
*   **Plant Images (avatars, plant photos)**:
    *   Stored as **Blobs** in **IndexedDB** (`plantImages` object store within a user-specific database, e.g., `LeafWiseDB_{userId}`).
    *   References (keys) to these images are stored in the plant metadata in `localStorage`.
*   **Image Compression**: Images are compressed client-side (to WebP or JPEG) before being stored in IndexedDB to manage storage size.
*   **Data Persistence**: Data is scoped per user and persists in the user's browser. Clearing browser data will remove it.
*   **Import/Export**: A JSON-based import/export feature is available for user profile and plant data (including base64 encoded images for transfer).

## Progressive Web App (PWA)

*   **Plugin**: `@ducanh2912/next-pwa`
*   **Features**:
    *   Installability (Add to Home Screen)
    *   Offline support (via service worker caching of app shell and assets)
    *   Responsiveness
    *   App Manifest (`public/manifest.json`)
    *   Service Worker (`public/sw.js` custom + Workbox injection) for caching and push notifications.
    *   App Shortcuts
    *   Push Notifications (client-side mechanism for showing notifications via service worker)
    *   Web Badging API (demonstration)

## Internationalization (i18n)

*   **Mechanism**: React Context API (`LanguageContext`)
*   **Languages Supported**: English (en), Vietnamese (vi)
*   **Storage**: Selected language preference is stored in `localStorage`.
*   **Implementation**: Static UI text is translated using JSON files (`src/locales/en.json`, `src/locales/vi.json`). AI-generated content is requested in the selected language. Date formatting adapts to the selected locale.

## Future (Beyond Prototype)

*   **Backend Server**: Node.js/Express, Python/Django, or BaaS (e.g., Firebase).
*   **Database**: Scalable database (e.g., PostgreSQL, MongoDB, Firebase Firestore).
*   **Authentication**: Secure JWT-based authentication handled by the backend.
*   **Image Storage**: Cloud storage (S3, Google Cloud Storage, Firebase Storage).
*   **Push Notifications**: Server-driven push notifications (e.g., FCM).
