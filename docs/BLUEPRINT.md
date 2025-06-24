
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
    *   Data is persisted using **AWS Amplify**. Plant records and care tasks are stored in Amplify Data and photos are uploaded to S3. Records reference the S3 key for each image.

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

## 4. Technical Stack

*   **Framework**: Next.js (App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI (Radix UI + Tailwind CSS)
*   **Styling**: Tailwind CSS
*   **AI Integration**: Genkit (Google Gemini models)
*   **State Management**: React Context API, `useState`, `useEffect`
*   **Forms**: React Hook Form with Zod for validation
*   **Date Management**: `date-fns`
*   **Client-Side Storage**:
*   **Backend & Data Persistence**:
    *   **Backend as a Service (BaaS)**: AWS Amplify Gen 2.
    *   **Authentication**: AWS Amplify Auth (Amazon Cognito) for user management.
    *   **Data Storage**: AWS Amplify Data (AWS AppSync & Amazon DynamoDB) for storing structured data like user profiles, plant details, and care tasks.
    *   **File Storage**: AWS Amplify Storage (Amazon S3) for storing user-uploaded images (avatars, plant photos).
*   **PWA**: `@ducanh2912/next-pwa`
*   **Internationalization (i18n)**: Support for English and Vietnamese using React Context and JSON files.

## 5. Data Model (AWS Amplify)

The data model is defined in the Amplify GraphQL schema (`amplify/data/resource.ts`) and managed by AWS Amplify Data. All models include `owner` fields for authorization.

*   **UserPreferences**: Stores user-specific settings.
    *   `id` (primary key, typically user's sub/ID)
    *   `owner` (string, for auth rules)
    *   `avatarS3Key?` (string)

*   **Plant**: Represents a single plant belonging to a user.
    *   `id` (primary key), `owner` (string)
    *   `commonName`, `scientificName?`, `familyCategory?`, `ageEstimateYears?`, `healthCondition`, `location?`, `plantingDate?`, `customNotes?`, `primaryPhotoUrl?` (S3 key)
    *   `photos`: Relationship to `PlantPhoto` (has many)
    *   `careTasks`: Relationship to `CareTask` (has many)

*   **PlantPhoto**: Represents a single photo of a plant.
    *   `id` (primary key), `owner` (string)
    *   `plant`: Relationship to `Plant` (belongs to)
    *   `url` (string, S3 key), `dateTaken?`, `healthCondition`, `diagnosisNotes?`, `notes?`

*   **CareTask**: Represents a single care task for a plant.
    *   `id` (primary key), `owner` (string)
    *   `plant`: Relationship to `Plant` (belongs to)
    *   `name`, `description?`, `frequency`, `frequencyEvery?`, `timeOfDay?`, `nextDueDate?`, `isPaused`, `level`

This blueprint outlines the core vision of the LeafWise application, now powered by AWS Amplify.
    