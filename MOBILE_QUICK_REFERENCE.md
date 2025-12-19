# 📱 Mobile Optimization - Quick Reference

## 🎯 Responsive Breakpoints

```tsx
xs:     375px   // Small phones (iPhone SE)
sm:     640px   // Large phones (iPhone 12/13/14)
md:     768px   // Tablets (iPad Mini)
lg:     1024px  // Small laptops (iPad Pro)
xl:     1280px  // Desktops
2xl:    1536px  // Large desktops
```

## 📐 Common Patterns

### Responsive Spacing
```tsx
// Padding
className="p-2 sm:p-4 lg:p-6"

// Margin
className="m-2 sm:m-4 lg:m-6"

// Gap
className="gap-2 sm:gap-4 lg:gap-6"
```

### Responsive Text
```tsx
// Font Size
className="text-sm sm:text-base lg:text-lg"

// Mobile fonts
className="text-xs-mobile sm:text-xs"
className="text-sm-mobile sm:text-sm"
className="text-base-mobile sm:text-base"
```

### Show/Hide Elements
```tsx
// Hide on mobile, show on desktop
className="hidden md:block"

// Show on mobile, hide on desktop
className="block md:hidden"

// Show only on tablet
className="hidden md:block lg:hidden"
```

### Responsive Grid
```tsx
// 1 column mobile, 2 tablet, 3 desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Auto-fit responsive
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

## 🖱️ Touch Targets

```tsx
// Minimum touch size (44x44px)
className="min-h-touch min-w-touch"

// Larger touch size (48x48px)
className="min-h-touch-lg min-w-touch-lg"

// Touch-friendly button
className="px-4 py-2 min-h-touch rounded-lg"
```

## 📱 Safe Areas

```tsx
// For notched devices
className="safe-top"     // padding-top
className="safe-bottom"  // padding-bottom
className="safe-left"    // padding-left
className="safe-right"   // padding-right
```

## 🎨 Responsive Components

### Modal
```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Title"
  maxWidth="max-w-6xl"  // Responsive max width
>
  {/* Content auto-adjusts */}
</Modal>
```

### Cards
```tsx
// Auto-responsive from 280px to 356px
<EnhancedFinancialCard
  // ... props
/>
```

### Dashboard
```tsx
// Responsive padding and gaps
<div className="px-2 sm:px-4">
  <div className="flex flex-wrap gap-3 sm:gap-6">
    {/* Cards */}
  </div>
</div>
```

## 📊 Media Query Examples

### Mobile Only
```css
@media (max-width: 768px) {
  .mobile-only {
    display: block;
  }
}
```

### Tablet Only
```css
@media (min-width: 768px) and (max-width: 1024px) {
  .tablet-only {
    display: block;
  }
}
```

### Touch Devices
```css
@media (hover: none) and (pointer: coarse) {
  .touch-device {
    padding: 0.75rem;
  }
}
```

### Mouse Devices
```css
@media (hover: hover) and (pointer: fine) {
  .mouse-device:hover {
    transform: scale(1.05);
  }
}
```

## ⚡ Performance Tips

1. **Use mobile-first approach**: Base styles for mobile, enhance for desktop
2. **Lazy load images**: `loading="lazy"`
3. **Optimize animations**: `transition-duration: 0.2s` on touch
4. **Hardware acceleration**: `transform: translateZ(0)`
5. **Avoid layout shifts**: Use fixed sizes when possible

## 🔧 Debugging Mobile

### Chrome DevTools
1. F12 → Toggle Device Toolbar (Ctrl+Shift+M)
2. Select device (iPhone, iPad, etc.)
3. Test different orientations
4. Throttle network (3G, 4G)

### Safari (iOS)
1. Enable Web Inspector on iPhone (Settings → Safari → Advanced)
2. Connect iPhone to Mac
3. Safari → Develop → [Your iPhone] → Select page

### Testing Checklist
- [ ] Test on real devices (iPhone, Android)
- [ ] Test portrait and landscape
- [ ] Test with different font sizes
- [ ] Test touch interactions
- [ ] Test safe areas (notched devices)
- [ ] Test keyboard interactions
- [ ] Test accessibility features

## 🎯 Quick Wins

```tsx
// 1. Make button touch-friendly
- className="px-2 py-1"
+ className="px-4 py-2 min-h-touch"

// 2. Add responsive text
- className="text-xl"
+ className="text-lg sm:text-xl"

// 3. Hide on mobile
+ className="hidden md:block"

// 4. Responsive padding
- className="p-6"
+ className="p-3 sm:p-6"

// 5. Stack on mobile
- className="flex gap-4"
+ className="flex flex-col sm:flex-row gap-2 sm:gap-4"
```

## 📱 Viewport Meta (Already Added)

```tsx
viewport: {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover'
}
```

---

**Status**: ✅ All optimizations complete  
**Support**: 375px (iPhone SE) to 4K displays  
**Touch**: All interactive elements ≥ 44px

For full documentation, see `MOBILE_OPTIMIZATION_COMPLETE.md`
