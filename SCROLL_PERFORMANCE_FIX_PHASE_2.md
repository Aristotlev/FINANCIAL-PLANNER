# Scroll Performance Fix - Phase 2

## Issue
The user reported that elements were "disappearing and reappearing" when scrolling up and down. This was likely caused by:
1.  **Insufficient `rootMargin`**: The previous margin of `200px` was too small for fast scrolling, causing the placeholder to be visible briefly before the card loaded.
2.  **Layout Instability**: The placeholder didn't have the exact dimensions of the card (`w-full` vs `w-[356px]`), causing the flex container to shift layout when cards loaded, which can look like elements disappearing/reappearing.
3.  **Missing Transitions**: The switch from placeholder to content was abrupt.

## Solution
Updated `components/ui/lazy-card-wrapper.tsx` with the following improvements:

1.  **Increased `rootMargin` to `800px`**: This is roughly 1-2 viewport heights. Cards will now load well before they enter the screen, ensuring they are ready when the user scrolls to them.
2.  **Fixed Dimensions**: Set the wrapper width to `w-full sm:w-[356px]` to match the `AnimatedCard` dimensions exactly. This prevents layout shifts.
3.  **Smoother Transitions**: Added `animate-in fade-in zoom-in-95` to the content rendering. This makes the appearance of cards smooth rather than jarring.
4.  **Better Placeholder**: Updated the placeholder to match the card's aesthetic better (rounded corners, backdrop blur) so it's less noticeable if it *is* seen.
5.  **Increased `minHeight`**: Adjusted to `380px` to better match the average card height, reducing vertical layout shifts.

## Verification
*   Scroll up and down rapidly. Elements should remain stable.
*   Cards should be loaded before they come into view.
*   No "flickering" or layout jumping should occur.
