# Performance Optimization Report - Phase 2

## Summary of Changes

We have addressed the reported lag and disappearing elements issues by optimizing scroll handlers, zoom implementation, and CSS rules.

### 1. Fixed Scroll Lag in Hidden Cards Folder
**Issue:** The `HiddenCardsFolder` component had an unthrottled `scroll` event listener that updated state on every scroll event when the folder was open.
**Fix:**
- Implemented `requestAnimationFrame` to throttle the scroll and resize event handlers.
- This ensures the position update only happens once per frame, significantly reducing main thread blocking during scroll.

### 2. Optimized Dashboard Zoom Performance
**Issue:** The Dashboard zoom container had `will-change: transform` always active, and the zoom logic used a non-passive wheel listener that could block scrolling.
**Fix:**
- Changed `will-change: transform` to be conditional: `willChange: isZooming ? 'transform' : 'auto'`. This prevents the browser from keeping a large texture in memory when not zooming.
- Optimized the wheel event handler to ensure it returns immediately if the zoom modifier key (Ctrl/Cmd) is not pressed.

### 3. Fixed Disappearing Elements (CSS)
**Issue:** Aggressive CSS rules in `globals.css` were forcing `transform: scale(1)` on all fixed elements to fix a previous zoom issue. This created new stacking contexts and caused fixed elements (like tooltips and modals) to be clipped or positioned incorrectly when inside a transformed parent.
**Fix:**
- Removed the problematic CSS block that forced `transform: scale(1)` on fixed elements.
- This restores standard CSS positioning behavior and should fix the "disappearing elements" issue.

### 4. General CSS Cleanup
**Issue:** Potential conflicts with `canvas.fixed` transforms.
**Fix:**
- Cleaned up the `canvas.fixed` CSS to ensure it stays fixed without interfering with other transforms.

## Verification
The application builds successfully. These changes target the specific root causes of the reported lag (scroll listeners) and visual glitches (CSS transforms).
