# Design System - JDM Retro Rides

## Aesthetic: Dark Heritage
A blend of 90s Japanese computer precision and classic automotive heritage. High-contrast, dark-mode first, with luxury metallic accents.

## Visual Tokens

### Colors
- **Charcoal Background**: `hsl(24 10% 7%)` — The primary canvas.
- **Bronze Primary**: `hsl(32 55% 52%)` — Used for focus, CTAs, and heritage accents.
- **Signal Red**: `hsl(6 72% 50%)` — Reserved strictly for "SOLD" status and critical warnings.
- **Text**: `hsl(36 30% 92%)` for primary, `hsl(32 12% 62%)` for descriptions.

### Typography (Intentional Pairings)
- **Bebas Neue**: Impact. Used sparingly for main sections and card titles.
- **Inter**: Cleanliness. Used for all multi-line text and UI labels.
- **JetBrains Mono**: Data. Used for technical specs (CC, BHP, VIN) to give a "logbook" feel.

## Component Recipes

### 1. Vehicle Cards
- **Structure**: High-contrast image header, clean spec list in Mono font, Bronze price tag.
- **Interactions**: Hover should trigger a subtle glow effect (`shadow-bronze`) and lift.

### 2. Immersive Overlays
- **Feel**: Deep focus. Using background blur and dark gradients to separate the vehicle from the inventory context.
- **Gallery**: Bento-grid or cinematic carousel layouts to highlight photography.

### 3. Navigation & Filtering
- **Design**: "Technical HUD" style. Minimalist inputs with bronze borders on focus.
- **Sorting**: Clearly labeled, using the Mono font for selection options.

## Guidelines
- **No Soft Shadows**: Use hard, high-radius deep shadows (`shadow-deep`) or tight bronze glows.
- **Grain**: Apply the grain utility to large charcoal surfaces to prevent "flat" digital feelings.
- **Density**: Prefer information density over excessive whitespace to maintain a technical, professional vibe.
