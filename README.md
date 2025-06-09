
# LeafWise - Advanced Plant Care UI Prototype

LeafWise is a feature-rich Next.js application designed as an advanced frontend UI prototype for a comprehensive plant care management system. It empowers users to manage their plant collection, diagnose plant health using AI, generate tailored care plans, track plant growth visually, and manage their tasks through an intuitive calendar system.

## Current State: Advanced Frontend UI Prototype

This project is currently an **advanced frontend UI prototype**. This means:

-   **User Interface (UI)** and **User Experience (UX)** for a wide range of features are implemented with a focus on a polished, native-app-like feel.
-   **Backend Functionality is Mocked/Simulated**:
    -   **User Authentication**: A client-side simulated authentication system is in place. User profiles (name, preferences, avatar key) are stored in IndexedDB, scoped by user email. Session status is managed using `localStorage`.
    -   **Plant Data & Images**: All plant data (details, care tasks, photo metadata) is stored in the browser's `localStorage`, scoped by the logged-in user. Actual plant images (photos, avatars) are stored as Blobs in the user's IndexedDB, also scoped by user.
    -   **No Production Database/Backend**: There is no live backend server or cloud database. Data will be lost if browser storage is cleared or if the user switches browsers/devices without using the export/import feature.
-   **AI Features**: AI-powered features are integrated using **Genkit** with Google's Gemini models, demonstrating intelligent plant diagnosis, care plan generation, and health comparisons. AI responses are internationalized.
-   **PWA Compliant**: The application is designed as a Progressive Web App, featuring installability, offline access for cached assets, responsive design, and other PWA characteristics.

## Features Implemented (Prototype Level)

### 1. Plant Management ("My Plants")
-   **View Plant Collection**: Displays plants in a responsive grid.
-   **Add New Plant**: Manually add new plants with details via a reusable form. Image stored in IndexedDB, plant data in `localStorage`.
-   **Edit Plant Details**: Modify existing plant information through a dialog-based form, including changing the primary photo from the gallery or a new upload.
-   **Delete Plant(s)**: Remove plants from the collection (single or multi-select via "Manage Mode").
-   **Search, Filter & Sort**:
    -   Search by name, location, family.
    -   Filter by age range, location, family category, and health condition.
    -   Sort by various attributes including common name, scientific name, age, location, family, health, created date, last cared date, and next care task date.
    -   Collapsible filter/sort panel with clearable active filter chips.
-   **Manage Mode**: Allows for multi-select operations (delete) and quick edit access via a dialog.

### 2. AI-Powered Plant Diagnosis ("Diagnose Plant")
-   **Image Upload & Compression**: Users can upload a plant photo (max 1MB), which is compressed client-side.
-   **AI Analysis**: Uses Genkit (Gemini) to:
    -   Identify the plant (common name, scientific name, family category, estimated age).
    -   Assess its health status ('healthy', 'needs_attention', 'sick', 'unknown') with a confidence level.
    -   Provide initial care recommendations.
    -   AI responses are provided in the user's selected language (English/Vietnamese).
-   **Save to My Plants**: Diagnosed plant details (including the compressed image to IDB) can be saved to the user's collection (`localStorage`).
-   **Generate Detailed Care Plan**:
    -   After saving a diagnosed plant, users can generate a detailed care plan.
    -   **Modes**: Basic (watering, lighting, basic maintenance) or Advanced (includes soil, pruning, fertilization).
    -   The AI provides specific, actionable tasks (name, description, suggested frequency, time of day, level), translated into the selected language.
    -   Generated care plans can be saved to the plant's profile in `localStorage`.

### 3. Plant Detail View
-   **Comprehensive Information**:
    -   Header card with primary image (clickable for full-size view), name, scientific name, health badge, "Cared For" duration, and "Last Cared" date.
    -   Information grid for age, created date, location, family category, and custom notes.
-   **Growth Monitoring**:
    -   **Photo Gallery**: Grid view of plant photos (newest first), each showing date taken and health condition at diagnosis. Photos stored in IndexedDB.
    *   **Manage Photos**: Select, delete (multi-select), and edit details (date, health, diagnosis notes, general notes) of gallery photos.
    *   **Primary Photo**: Set any gallery photo as the plant's primary photo.
    -   **Add Photo & Diagnose**: Upload new photos for an existing plant. AI provides:
        -   A new health diagnosis.
        -   A comparison to the plant's current overall health, suggesting an update if necessary (user can accept/deny).
        -   AI-suggested updates to the plant's care plan tasks (modifications, new tasks, removals) based on the new diagnosis (user can accept/deny).
    -   **Health Trend Chart**: Visualizes the plant's health condition over time based on diagnosed photos. Chart dots are clickable to view diagnosis details.
-   **Care Plan Management**:
    -   Lists all care tasks, sorted by next due date, highlighting tasks due "today".
    *   **Manage Tasks**: Add new tasks, edit existing tasks, and delete tasks (single or multi-select).
    -   **Pause/Resume Tasks**: Temporarily pause or resume care tasks.
    -   **AI Care Plan Review**: Button to trigger an AI review of the current care plan based on plant's overall status, suggesting modifications or new tasks.
    -   **Weekly Care Schedule View**: A visual calendar showing task occurrences for the current week (navigable). Displays tasks in hourly slots or as "All Day" events. Option to show only time slots with tasks. Highlights today's column. Basic tasks and Advanced tasks have distinct visual styling.

### 4. Care Calendar (Global View)
-   **Combined Schedule**: Displays care tasks for all plants in a weekly or monthly view.
-   **Plant Filtering**: Collapsible panel to filter the calendar by selected plants (displays plant avatars).
-   **Navigation**: View previous/next week or month.
-   **Task Display**: Shows plant avatar, task name, and a placeholder checkmark icon.
-   **Monthly View**:
    -   Displays date numbers in each cell.
    -   Daytime (amber background) and nighttime (sky blue background) areas within each cell with distinct backgrounds.
    -   Highlights today's date with a thicker border and primary color text.

### 5. User Account & Settings (Simulated, Data in IndexedDB/`localStorage`)
-   **Email Login/Registration**: Frontend forms for user sign-up and sign-in. User ID derived from email for consistent data scoping.
-   **Profile Page**:
    -   Displays user name, email, and avatar.
    -   **Edit Profile**: Allows changing name and avatar (avatar stored in IDB, profile in IDB).
    -   **Preferences**: Toggles for Push Notifications (saved to user profile in IDB). Push notification switch includes permission request flow.
    -   **Data Management**:
        -   Export all personal data (profile and plants, including base64 encoded images) to a JSON file.
        -   Import data from a JSON file to restore profile and plants (images are saved back to IDB).
    -   **Account Actions**:
        -   Log out (with confirmation dialog).
        -   DESTROY all my data (with email confirmation; clears user-scoped `localStorage` and IndexedDB data).
-   **Settings Dialog** (Accessible from Navbar):
    -   **Dark Mode Toggle**: Switch between light, dark, and system themes (uses `next-themes`).
    -   **Language Selection**: Switch between English and Vietnamese.

### 6. Internationalization (i18n)
-   Support for English and Vietnamese languages for all static UI text.
-   Date and time formats adapt to the selected locale using `date-fns`.
-   AI-generated content (diagnoses, care plans) is requested and displayed in the selected language.

### 7. Progressive Web App (PWA) Features
-   **Installability**: App can be installed to the home screen.
-   **Offline Support**: Basic offline access for cached application shell and data stored in `localStorage`/IndexedDB. Runtime caching for placeholder images.
-   **Responsiveness**: Adapts to various screen sizes. Standalone PWA mode features a bottom navigation bar.
-   **Security**: Designed for HTTPS.
-   **Discoverability**: Basic SEO metadata, `robots.txt`, and `sitemap.xml`.
-   **Automatic Updates**: Service worker handles updates.
-   **App Shortcuts**: Manifest configured for quick actions (Add Plant, Diagnose, View Calendar).
-   **Web Badging API**: Demo buttons on Profile page to set/clear app icon badges.
-   **Push Notifications**: Mechanism for showing push notifications (permission request and test notification).

### 8. General UI & UX
-   Custom SVG App Logo.
-   Global navigation progress bar (Framer Motion).
-   Loading indicators on buttons and for data fetching.
-   Toasts/Notifications for user feedback.
-   Custom sleek scrollbar styling.

## Tech Stack

-   **Framework**: Next.js (App Router)
-   **Language**: TypeScript
-   **UI Components**: ShadCN UI
-   **Styling**: Tailwind CSS
-   **AI Integration**: Genkit (with Google Gemini models)
-   **State Management**: React Context API, `useState`, `useEffect`, `useCallback`, `useMemo`
-   **Forms**: React Hook Form with Zod for validation
-   **Date Management**: `date-fns`
-   **Animation**: Framer Motion (navigation progress bar)
-   **PWA**: `@ducanh2912/next-pwa`
-   **Client-Side Storage**:
    -   `localStorage`: User session indicator, plant metadata (scoped by user ID).
    -   IndexedDB: User profiles (name, avatar key, preferences), plant images (Blobs, scoped by user ID).
-   **Image Compression**: Client-side via HTML Canvas API (defaults to WebP).

## Getting Started

### Prerequisites
-   Node.js (version 18.x or later recommended)
-   npm, yarn, or pnpm

### Installation
1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd leafwise-frontend-prototype
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    # yarn install
    # or
    # pnpm install
    ```
3.  Set up environment variables:
    Create a `.env` file in the root of the project. You will need to add your Google AI API key for Genkit to function:
    ```env
    GOOGLE_API_KEY=YOUR_GOOGLE_AI_API_KEY
    ```
    *(Note: For this prototype, if AI features are not critical for testing UI, Genkit calls might gracefully degrade or mock responses can be implemented in the flows.)*

### Running the Development Server
1.  Start the Next.js development server:
    ```bash
    npm run dev
    ```
2.  Open [http://localhost:9002](http://localhost:9002) (or the port specified in your `dev` script) in your browser to see the application.

### Running Genkit (for AI features)
If you want to test the AI features, you'll need to run the Genkit development server in a separate terminal:
1.  From the project root:
    ```bash
    npm run genkit:dev
    # or for auto-reloading on changes
    # npm run genkit:watch
    ```
    This will typically start the Genkit developer UI on `http://localhost:4000`.

## Project Structure (Key Directories)

-   `src/app/`: Main application routes (App Router).
-   `src/components/`: Reusable UI components.
    -   `src/components/ui/`: ShadCN UI components.
    -   `src/components/layout/`: Layout-related components (Navbar, AppLayout, Logo, ProgressBar).
    -   `src/components/plants/`: Plant-specific components (PlantCard, SavePlantForm, details sub-components, etc.).
    -   `src/components/diagnose/`: Components for the Diagnose Plant page.
    -   `src/components/calendar/`: Components for the Care Calendar page.
-   `src/ai/`: Genkit AI integration.
    -   `src/ai/flows/`: Genkit flow definitions.
-   `src/contexts/`: React Context API providers (Auth, Language, Progress, PlantData).
-   `src/hooks/`: Custom React hooks (useProgress, useS3Image, usePWAStandalone).
-   `src/lib/`: Utility functions, constants, mock data, IndexedDB helper, image utilities.
-   `src/locales/`: Translation files for i18n (en.json, vi.json).
-   `src/types/`: TypeScript type definitions.
-   `public/`: Static assets (manifest.json, icons, robots.txt, sitemap.xml, sw.js).

## Next Steps (Beyond Prototype)

-   Implement a proper backend server (e.g., Node.js/Express, Python/Django/Flask, or a BaaS like Firebase).
-   Integrate a real, scalable database (e.g., PostgreSQL, MongoDB, Firebase Firestore).
-   Implement secure JWT-based authentication on the backend, including refresh tokens.
-   Replace simulated data operations with actual API calls to the backend.
    -   Image uploads should go to a cloud storage service (S3, Google Cloud Storage, Firebase Storage).
-   Develop robust error handling and data validation on both client and server.
-   Implement a real push notification system using backend services (e.g., Firebase Cloud Messaging).
-   Implement scheduled task reminders using a backend cron job or similar.
-   Refine and expand AI capabilities, possibly with model fine-tuning.
-   Add comprehensive testing (unit, integration, e2e).
-   Set up CI/CD pipelines for automated builds and deployments.
-   Deploy to a production hosting platform with HTTPS.
-   Implement analytics and monitoring.
