
# LeafWise - Application Blueprint

## 1. Application Overview

**App Name**: LeafWise

**Tagline**: Your personal plant care assistant, helping you identify, diagnose, and care for your plants with AI-powered insights.

**Core Goal**: To provide a comprehensive and user-friendly mobile-first web application for plant enthusiasts to manage their plant collection, understand plant health, and maintain optimal care routines.

## 2. Core Features

The application will include the following core features:

*   **Plant Identification**:
    *   Users can upload a photo of a plant.
    *   The application will utilize an AI-powered plant identification tool (integrated into the "Diagnose Plant" feature) to identify the plant's species.
    *   Results will include common name, scientific name, and family category.

*   **Plant Profiles**:
    *   Users can manually add details about each of their plants or save diagnosed plants.
    *   Information to store includes:
        *   Common Name (required)
        *   Scientific Name (optional)
        *   Family Category (required)
        *   Age Estimation (optional, numeric in years)
        *   Health Condition (dropdown: Healthy, Needs Attention, Sick, Unknown; required)
        *   Location (optional, text)
        *   Custom Notes (optional, textarea)
        *   Primary Photo (optional, image upload)
    *   This data is stored locally in the user's browser (IndexedDB for images, `localStorage` for metadata, scoped per user).

*   **AI-Powered Plant Diagnosis**:
    *   Integrated with the "Add Photo & Diagnose" feature for existing plants and the main "Diagnose Plant" page.
    *   Analyzes an uploaded plant photo (and optional user description).
    *   Provides:
        *   Plant identification (common name, scientific name, family category, estimated age).
        *   Health assessment (status: healthy, needs_attention, sick, unknown; diagnosis text; confidence level).
        *   Initial care recommendations.
    *   Supports language selection for AI responses (English/Vietnamese).

*   **Care Plan Management**:
    *   Each plant profile can have associated care tasks.
    *   Users can manually add, edit, and delete care tasks.
    *   Tasks include: name, description, frequency, time of day, level (basic/advanced), and next due date.
    *   **AI-Generated Care Plans**:
        *   After a plant is diagnosed and saved, users can generate a detailed care plan.
        *   Supports "Basic" (watering, lighting, basic maintenance) and "Advanced" (includes soil, pruning, fertilization) modes.
        *   AI provides specific, actionable tasks with suggested frequency and time.
    *   **AI Care Plan Review**:
        *   For existing plants, users can trigger an AI review of the current care plan based on the plant's overall status, suggesting modifications or new tasks.
        *   When adding a new photo to an existing plant, the AI suggests updates to the care plan based on the new diagnosis.

*   **Care Calendar**:
    *   Displays a combined schedule of care tasks for all user's plants.
    *   Supports weekly and monthly views.
    *   Allows filtering tasks by selected plants.
    *   Highlights tasks due "today".

*   **Growth Monitoring (Photo Journal)**:
    *   Users can upload photos of their plants over time to track growth and health changes.
    *   Each photo is associated with a date and a health diagnosis from that time.
    *   Photo gallery displays images with date and health status.
    *   Includes a health trend chart visualizing health condition over time.
    *   Supports managing photos (edit details, delete, set as primary).

*   **Pause Caring Task**:
    *   Users can indicate whether a specific caring task is paused.
    *   They can set a date to resume the task.
    *   Paused tasks are temporarily removed from the active schedule and notifications are suppressed until resumed.

## 3. Style Guidelines & UI/UX

*   **Primary Color**: Lime green (#32CD32) - for a fresh, natural, and vibrant feel.
*   **Secondary Color**: Light grey (#F5F5F5) - for clean backgrounds and a modern look.
*   **Accent Color**: Terracotta (#E07A5F) - for interactive elements, highlights, and calls to action.
*   **Typography**: Clean, modern, and highly readable sans-serif fonts (e.g., Geist Sans). Ensure good contrast for accessibility.
*   **Icons**: Simple, nature-inspired icons. Primarily use `lucide-react` for consistency.
*   **Layout**:
    *   Grid-based layout for visually appealing and organized display of plant information (e.g., My Plants grid, photo gallery).
    *   Mobile-first responsive design, ensuring excellent usability on all devices.
    *   PWA standalone view will feature a bottom navigation bar for native app feel.
*   **Components**:
    *   Utilize ShadCN UI components as the base, customized to match the LeafWise theme.
    *   Components should be aesthetically pleasing, functional, and suitable for production quality.
    *   Employ rounded corners, subtle shadows, and professional visual hierarchy.
*   **User Experience**:
    *   Intuitive navigation.
    *   Clear feedback for user actions (e.g., loading states, toast notifications).
    *   Accessibility considerations (ARIA attributes, keyboard navigation, sufficient color contrast).

## 4. Technical Stack (Frontend UI Prototype)

*   **Framework**: Next.js (App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI (Radix UI + Tailwind CSS)
*   **Styling**: Tailwind CSS
*   **AI Integration**: Genkit (Google Gemini models)
*   **State Management**: React Context API, `useState`, `useEffect`
*   **Forms**: React Hook Form with Zod for validation
*   **Date Management**: `date-fns`
*   **Client-Side Storage**:
    *   `localStorage`: User session indicator (`currentLeafwiseUserId`), user-specific plant metadata (`leafwisePlants_{userId}`).
    *   IndexedDB: User profiles (`userProfileStore` in `LeafWiseDB_{userId}`), plant images (`plantImages` object store in `LeafWiseDB_{userId}`).
*   **PWA**: `@ducanh2912/next-pwa`
*   **Internationalization (i18n)**: Support for English and Vietnamese using React Context and JSON files.

## 5. Data Model (Simplified for Prototype)

*   **User (from AuthContext, stored in IndexedDB)**: `id` (email), `name`, `email`, `avatarUrl` (IDB key for an image in `plantImages` store), `preferences` (object: `emailNotifications`, `pushNotifications`).
*   **Plant (from PlantDataContext, stored in `localStorage`)**: `id`, `commonName`, `scientificName?`, `familyCategory?`, `ageEstimateYears?`, `healthCondition`, `location?`, `plantingDate?`, `customNotes?`, `primaryPhotoUrl?` (IDB key), `photos` (array of `PlantPhoto`), `careTasks` (array of `CareTask`), `lastCaredDate?`.
*   **PlantPhoto**: `id` (IDB key), `url` (IDB key), `dateTaken`, `healthCondition`, `diagnosisNotes?`, `notes?`. Image Blob stored in user-specific IndexedDB (`plantImages` store).
*   **CareTask**: `id`, `plantId`, `name`, `description?`, `frequency`, `timeOfDay?`, `lastCompleted?`, `nextDueDate?`, `isPaused`, `resumeDate?`, `level`.

This blueprint outlines the core vision and current state of the LeafWise frontend UI prototype.
    