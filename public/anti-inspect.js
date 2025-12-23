/**
 * Anti-Inspect Protection Script
 * Prevents casual inspection of website elements and code
 * Note: Determined users can bypass these protections, but it deters casual inspection
 */

(function() {
  'use strict';

  // Only run in production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Anti-inspect disabled in development mode');
    return;
  }

  // ==========================================
  // 1. Disable Right-Click Context Menu
  // ==========================================
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  }, { capture: true });

  // ==========================================
  // 2. Block Keyboard Shortcuts for Dev Tools
  // ==========================================
  document.addEventListener('keydown', function(e) {
    // F12 - Open DevTools
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac) - Open DevTools
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+J (Windows/Linux) or Cmd+Option+J (Mac) - Open Console
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+C (Windows/Linux) or Cmd+Option+C (Mac) - Inspect Element
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+U (Windows/Linux) or Cmd+Option+U (Mac) - View Source
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+S (Windows/Linux) or Cmd+S (Mac) - Save Page
    if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+K (Firefox) - Web Console
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k' || e.keyCode === 75)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+E (Firefox) - Network tab
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e' || e.keyCode === 69)) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

  // ==========================================
  // 3. Detect DevTools Opening
  // ==========================================
  let devToolsOpen = false;
  const threshold = 160;

  const detectDevTools = function() {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        handleDevToolsOpen();
      }
    } else {
      devToolsOpen = false;
    }
  };

  const handleDevToolsOpen = function() {
    // You can customize this behavior
    // Option 1: Show a warning
    console.clear();
    console.log('%cStop!', 'color: red; font-size: 50px; font-weight: bold;');
    console.log('%cThis is a browser feature intended for developers.', 'font-size: 18px;');
    console.log('%cIf someone told you to copy-paste something here, it is a scam.', 'font-size: 18px; color: red;');
    
    // Option 2: Redirect (uncomment if desired)
    // window.location.href = '/';
    
    // Option 3: Clear the page (uncomment if desired)
    // document.body.innerHTML = '<h1 style="text-align:center;margin-top:50px;">Developer tools detected</h1>';
  };

  // Check periodically
  setInterval(detectDevTools, 1000);
  window.addEventListener('resize', detectDevTools);

  // ==========================================
  // 4. Disable Text Selection (Optional)
  // ==========================================
  // Uncomment if you want to disable text selection
  /*
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  });
  */

  // ==========================================
  // 5. Disable Drag Events
  // ==========================================
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  }, { capture: true });

  // ==========================================
  // 6. Disable Copy (Optional)
  // ==========================================
  // Uncomment if you want to disable copying
  /*
  document.addEventListener('copy', function(e) {
    e.preventDefault();
    return false;
  });
  */

  // ==========================================
  // 7. Console Warning
  // ==========================================
  console.log('%cStop!', 'color: red; font-size: 50px; font-weight: bold;');
  console.log('%cThis is a browser feature intended for developers.', 'font-size: 18px;');
  console.log('%cIf someone told you to copy-paste something here to enable a feature or "hack" someone\'s account, it is a scam.', 'font-size: 18px; color: red;');

  // ==========================================
  // 8. Debugger trap (makes debugging harder)
  // ==========================================
  (function debuggerTrap() {
    const startTime = new Date();
    debugger;
    const endTime = new Date();
    if (endTime - startTime > 100) {
      // Debugger was triggered - someone is inspecting
      handleDevToolsOpen();
    }
    setTimeout(debuggerTrap, 1000);
  })();

  // ==========================================
  // 9. Override console methods in production
  // ==========================================
  const noop = function() {};
  const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'dirxml', 'group', 'groupEnd', 'time', 'timeEnd', 'assert', 'profile'];
  
  // Keep original console for our warnings
  const originalConsole = {};
  methods.forEach(function(method) {
    originalConsole[method] = console[method];
  });
  
  // Clear console periodically (optional - can be annoying for debugging)
  // setInterval(function() { console.clear(); }, 5000);

})();
