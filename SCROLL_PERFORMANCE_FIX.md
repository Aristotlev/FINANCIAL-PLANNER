# Scroll Performance Optimization

## Issue
The user reported that loading elements when scrolling takes too much time and is laggy. This was caused by the dashboard rendering all financial cards simultaneously, including their heavy 3D visualizations and data fetching logic.

## Solution
Implemented lazy loading for the dashboard cards using the Intersection Observer API.

### Changes
1.  **Created `components/ui/lazy-card-wrapper.tsx`**:
    *   A wrapper component that uses `IntersectionObserver` to detect when an element enters the viewport.
    *   It renders a lightweight placeholder (skeleton loader) initially.
    *   It only renders the actual content (children) when the element is close to the viewport (within 200px margin).
    *   This prevents the browser from rendering and processing all cards at once on initial load.

2.  **Updated `components/dashboard.tsx`**:
    *   Imported `LazyCardWrapper`.
    *   Wrapped the `renderCard` call inside the `cardOrder.map` loop with `LazyCardWrapper`.
    *   This ensures that as the user scrolls, cards are loaded on demand.

### Benefits
*   **Faster Initial Load**: The browser only needs to render the visible cards and placeholders for the rest.
*   **Smoother Scrolling**: Heavy components (charts, 3D effects) are initialized only when needed, reducing the main thread work during scrolling.
*   **Reduced Network Requests**: If cards fetch data on mount, lazy loading spreads out these requests as the user scrolls, rather than firing them all at once.

## Verification
*   The dashboard should load faster.
*   Scrolling down should trigger the loading of new cards (indicated by a brief spinner/skeleton).
*   The "laggy" feeling during scrolling should be significantly reduced.
