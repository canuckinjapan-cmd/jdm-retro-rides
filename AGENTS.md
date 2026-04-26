# Agent Implementation Guide - JDM Retro Rides

## Technical Architecture

- **Runtime**: Vite + React 19 + TypeScript.
- **Styling**: Tailwind CSS 4 with CSS-variable based theme definitions in `src/index.css`.
- **Database**: Firebase Firestore (Enterprise Edition).
- **Authentication**: Firebase Authentication (Google popup).
- **Components**: Radix-based UI components (managed via shadcn patterns).
- **Animations**: `motion` from `motion/react`.

## Technical Constraints & Patterns

1. **Firestore Consistency**:
   - Data models are defined in `firebase-blueprint.json`.
   - Security rules are maintained in `firestore.rules`.
   - Always use `handleFirestoreError` for database calls.

2. **Typography System**:
   - Display: `font-display` (Bebas Neue) for H1, H2, and hero text.
   - UI: `font-sans` (Inter) for functional elements and body copy.
   - Technical: `font-mono` (JetBrains Mono) for specs, codes, and data tables.

3. **Responsive Logic**:
   - The app uses custom responsive logic for overlays (e.g., `md:landscape`, `lg` breakpoints).
   - Use Tailwind's utility classes for responsive design first.

4. **Component Location**:
   - Individual page components should remain in `src/pages/`.
   - Shared logic for specific features (like vehicle details) should be in `src/components/`.

## Key Files
- `src/index.css`: The source of truth for the design system theme.
- `src/lib/firebase.ts`: Initialization and shared error handling for Firebase.
- `firebase-blueprint.json`: The schema definition for the Firestore database.
