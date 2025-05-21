
# LeafWise - Plant Care Management (Frontend UI Prototype)

LeafWise is a Next.js application designed as a frontend UI prototype for a comprehensive plant care management system. It allows users to manage their plant collection, diagnose plant health using AI, generate care plans, and track their plant's growth.

## Current State: Frontend UI Prototype

This project is currently a **frontend UI prototype**. This means:
-   **User Interface (UI)** and **User Experience (UX)** for the described features are implemented.
-   **Backend Functionality is Mocked**: All operations that would typically require a backend (like saving plant data, user authentication, persistent storage) are simulated on the client-side using mock data (`src/lib/mock-data.ts`) and browser `localStorage`.
-   **No Production Database**: There is no live database connected. Plant data, user accounts, etc., will reset if `localStorage` is cleared or if the mock data files are altered.
-   **AI Features**: AI-powered features are integrated using **Genkit** with Google's Gemini models, demonstrating the potential for intelligent plant care assistance.

## Features Implemented (Prototype Level)

### 1. Plant Management ("My Plants")
-   **View Plant Collection**: Displays plants in a grid or list view.
-   **Add New Plant**: Manually add new plants with details like common name, scientific name, family category, age, health condition, location, notes, and a primary photo.
-   **Edit Plant Details**: Modify existing plant information through a form.
-   **Delete Plant(s)**: Remove plants from the collection (single or multi-select).
-   **Search, Filter & Sort**:
    -   Search by name, location, family.
    -   Filter by age range, location, family category, and health condition.
    -   Sort by various attributes including next care task date.
-   **Manage Mode**: Allows for multi-select operations (delete) and quick edit access.

### 2. AI-Powered Plant Diagnosis ("Diagnose Plant")
-   **Image Upload**: Users can upload a photo of a plant.
-   **AI Analysis**: Uses Genkit to:
    -   Identify the plant (common name, scientific name, family category, estimated age).
    -   Assess its health (healthy, needs attention, sick) with a confidence level.
    -   Provide initial care recommendations.
-   **Save to My Plants**: Diagnosed plant details can be saved to the user's collection.
-   **Generate Detailed Care Plan**:
    -   After saving a diagnosed plant, users can generate a detailed care plan.
    -   **Modes**: Basic (watering, lighting, basic maintenance) or Advanced (includes soil, pruning, fertilization).
    -   The AI provides specific tasks (name, description, suggested frequency, time of day, level).
    -   Generated care plans can be saved to the plant's profile.

### 3. Plant Detail View
-   **Comprehensive Information**: Displays all details of a specific plant.
-   **Growth Monitoring**:
    -   **Photo Gallery**: Grid view of plant photos, sorted newest first. Each photo shows the date and health condition at the time of diagnosis.
    -   **Manage Photos**: Select, delete, and edit details (date, health, notes) of gallery photos.
    -   **Primary Photo**: Set any gallery photo as the plant's primary photo.
    -   **Add Photo & Diagnose**: Upload new photos for an existing plant. The AI provides:
        -   A new health diagnosis.
        -   A comparison to the plant's current overall health, suggesting an update if necessary.
        -   Suggestions for updating the plant's care plan tasks based on the new diagnosis (users can accept or deny these suggestions).
    -   **Health Trend Chart**: Visualizes the plant's health condition over time based on diagnosed photos. Chart dots are clickable to view diagnosis details.
-   **Care Plan Management**:
    -   Lists all care tasks for the plant, sorted by next due date.
    -   Tasks due "today" are highlighted.
    *   **Manage Tasks**: Add new tasks, edit existing tasks (name, description, start date, frequency, time of day, level), and delete tasks (single or multi-select).
    -   **Pause/Resume Tasks**: Temporarily pause or resume care tasks.
    -   **Weekly Care Schedule View**: A visual calendar showing task occurrences for the current week (navigable). Displays tasks in hourly slots or as "All Day" events. Option to show only time slots with tasks.

### 4. Care Calendar (Global View)
-   **Combined Schedule**: Displays care tasks for all plants in a weekly or monthly view.
-   **Plant Filtering**: Users can filter the calendar to show tasks for selected plants.
-   **Navigation**: View previous/next week or month.
-   **Task Display**: Shows plant avatar, task name, and a placeholder checkmark icon.
-   **Monthly View**:
    -   Displays date numbers in each cell.
    -   Daytime and nighttime areas within each cell with distinct backgrounds.
    -   Highlights today's date.

### 5. User Account & Settings (Mocked)
-   **Email Login/Registration**: Frontend forms for user sign-up and sign-in.
-   **Profile Page**:
    -   Displays user name, email, and avatar.
    -   **Edit Profile**: Allows changing name and avatar (mock saved to `localStorage`).
    -   **Preferences**: Toggles for Email Notifications and Push Notifications (mock saved).
    -   **Data Management**:
        -   Export all personal data (profile and plants) to a JSON file.
        -   Import data from a JSON file to restore profile and plants.
    -   **Account Actions**:
        -   Log out (clears mock session).
        -   DESTROY all my data (with email confirmation; clears mock data and logs out).
-   **Settings Dialog**:
    -   Accessible from the navbar.
    -   **Dark Mode Toggle**: Switch between light, dark, and system themes.
    -   **Language Selection**: Switch between English and Vietnamese.

### 6. General UI & UX
-   **Responsive Design**: Adapts to various screen sizes.
-   **PWA Compliant**: Includes a web app manifest for installability and basic service worker setup via `@ducanh2912/next-pwa`.
-   **Navigation**: Top navigation bar.
-   **Loading Indicators**:
    -   Global loading progress bar for page navigations (using a custom hook and Framer Motion).
    -   Spinners on buttons during asynchronous operations (e.g., AI diagnosis).
-   **Toasts/Notifications**: For user feedback on actions (e.g., plant saved, error messages).

## Tech Stack

-   **Framework**: Next.js (App Router)
-   **Language**: TypeScript
-   **UI Components**: ShadCN UI
-   **Styling**: Tailwind CSS
-   **AI Integration**: Genkit (with Google Gemini models)
-   **State Management**: React Context API, `useState`, `useEffect`, `useCallback`, `useMemo`
-   **Forms**: React Hook Form with Zod for validation
-   **Date Management**: `date-fns`
-   **Animation**: Framer Motion (for the navigation progress bar)
-   **PWA**: `@ducanh2912/next-pwa`

## Getting Started

### Prerequisites
-   Node.js (version 18.x or later recommended)
-   npm, yarn, or pnpm

### Installation
1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-name>
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
    -   `src/components/layout/`: Layout-related components (Navbar, AppLayout).
    -   `src/components/plants/`: Plant-specific components (PlantCard, SavePlantForm, etc.).
    -   `src/components/diagnose/`: Components for the Diagnose Plant page.
    -   `src/components/calendar/`: Components for the Care Calendar page.
-   `src/ai/`: Genkit AI integration.
    -   `src/ai/flows/`: Genkit flow definitions.
-   `src/contexts/`: React Context API providers (Auth, Language, Progress).
-   `src/hooks/`: Custom React hooks.
-   `src/lib/`: Utility functions, constants, mock data.
-   `src/locales/`: Translation files for i18n.
-   `src/types/`: TypeScript type definitions.
-   `public/`: Static assets (manifest.json, icons - placeholders currently).

## Next Steps (Beyond Prototype)

-   Implement a proper backend (e.g., Node.js/Express, Python/Django/Flask, or a BaaS like Firebase).
-   Integrate a real database (e.g., PostgreSQL, MongoDB, Firebase Firestore).
-   Implement secure JWT-based authentication on the backend.
-   Replace mock API calls with actual API calls to the backend.
-   Develop robust error handling and data validation on both client and server.
-   Implement actual push notification system.
-   Further refine and expand AI capabilities.
-   Add comprehensive testing (unit, integration, e2e).
-   Deploy to a hosting platform.
