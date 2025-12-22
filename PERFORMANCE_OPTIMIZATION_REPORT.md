# Performance Optimization Report

## Issues Addressed
1.  **Cumulative Layout Shift (CLS)**: High score (0.478) causing visual instability.
2.  **Unused JavaScript**: Large bundle size (5.6MB) causing slow load times and high Total Blocking Time (TBT).
3.  **Disappearing Elements**: Elements vanishing during fast scrolling.

## Solutions Implemented

### 1. Code Splitting & Lazy Loading (Fixes Unused JS & TBT)
*   **Lazy Loaded Financial Cards**: All financial cards (`CashCard`, `CryptoCard`, etc.) are now lazy loaded using `React.lazy`. This means their code is split into separate chunks and only loaded when needed.
*   **Dynamic PDF Generation**: The heavy `jspdf` and `jspdf-autotable` libraries are now dynamically imported only when the user clicks "Export PDF". This removes them from the initial bundle entirely.

### 2. Enhanced Lazy Loading (Fixes CLS & Disappearing Elements)
*   **Increased Pre-loading**: Updated `LazyCardWrapper` to use an `800px` root margin (up from 200px). This ensures cards start loading well before they enter the viewport, preventing them from "popping in" or appearing blank during fast scrolling.
*   **Stable Dimensions**: Enforced fixed width (`w-full sm:w-[356px]`) and improved `minHeight` on the wrapper to match the actual card dimensions. This prevents layout shifts when the card content loads.
*   **Smooth Transitions**: Added `animate-in fade-in zoom-in-95` to the card rendering. This ensures that if a card does load while in view, it appears smoothly.
*   **Skeleton Loading**: Implemented `CardSkeleton` and wrapped lazy components in `Suspense`. This shows a high-fidelity placeholder while the card chunk is being fetched, preventing layout collapse.

## Expected Results
*   **Lower TBT**: The main thread will be less blocked during initial load.
*   **Lower CLS**: The layout will be stable thanks to the skeletons and fixed dimensions.
*   **Faster LCP**: The main content will paint faster as the bundle size is smaller.
*   **Smoother Scrolling**: No more disappearing elements or jank.

## Verification
*   Run Lighthouse again in Incognito mode.
*   Verify that the "Unused JavaScript" warning is significantly reduced.
*   Verify that CLS is below 0.1.
