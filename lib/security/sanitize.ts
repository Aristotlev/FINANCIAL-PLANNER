/**
 * HTML Sanitization Utilities
 * 
 * Provides safe HTML handling to prevent XSS attacks.
 * Use these utilities when you need to render user-generated content
 * or any content that might contain HTML.
 * 
 * SECURITY GUIDELINES:
 * 1. Always sanitize user input before rendering
 * 2. Use JSON.stringify for embedding data in <script> tags
 * 3. Prefer React's default escaping over dangerouslySetInnerHTML
 * 4. When you must use dangerouslySetInnerHTML, use these utilities
 */

/**
 * Escape HTML special characters to prevent XSS
 * This converts <, >, &, ", and ' to their HTML entities
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return text.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Strip all HTML tags from a string
 * Use this when you want plain text only
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Allowed HTML tags for limited markdown-like formatting
 */
const ALLOWED_TAGS = new Set([
  'strong', 'b', 'em', 'i', 'u', 'code', 'pre', 
  'br', 'p', 'span', 'div', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'blockquote', 'hr',
]);

/**
 * Allowed attributes for HTML tags
 */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  span: new Set(['class']),
  div: new Set(['class']),
  code: new Set(['class']),
  pre: new Set(['class']),
};

/**
 * Sanitize HTML by removing dangerous tags and attributes
 * This is a basic sanitizer - for production use consider DOMPurify
 */
export function sanitizeHtml(html: string): string {
  // First, escape everything
  let safe = escapeHtml(html);
  
  // Then selectively re-enable allowed tags
  // This approach is safer than trying to parse HTML
  
  // Allow basic formatting tags
  ALLOWED_TAGS.forEach(tag => {
    // Opening tags (with potential attributes)
    const openRegex = new RegExp(`&lt;${tag}(&gt;|\\s[^&]*&gt;)`, 'gi');
    safe = safe.replace(openRegex, (match) => {
      // Convert back the tag but keep content escaped
      return match
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    });
    
    // Closing tags
    const closeRegex = new RegExp(`&lt;/${tag}&gt;`, 'gi');
    safe = safe.replace(closeRegex, `</${tag}>`);
  });
  
  return safe;
}

/**
 * Create safe HTML for embedding in a script tag
 * Uses JSON.stringify which automatically escapes special characters
 */
export function safeJsonForScript<T>(data: T): string {
  return JSON.stringify(data)
    // Additional escaping for </script> injection
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<!--/g, '<\\!--');
}

/**
 * Convert plain text markdown to safe HTML
 * Similar to the formatMarkdown function but explicitly documented
 */
export function markdownToSafeHtml(text: string): string {
  // First escape all HTML
  let html = escapeHtml(text);
  
  // Then convert markdown patterns to HTML
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Code: `code`
  html = html.replace(
    /`(.+?)`/g, 
    '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>'
  );
  
  // Links: [text](url) - only allow http/https
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
  );
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  return `<p>${html}</p>`;
}

/**
 * Validate and sanitize a URL
 * Only allows http, https, and mailto protocols
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Check if content contains potentially dangerous patterns
 */
export function containsDangerousPatterns(content: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,  // onclick=, onerror=, etc.
    /data:\s*text\/html/i,
    /vbscript:/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * AUDIT LOG for dangerouslySetInnerHTML usage in this codebase:
 * 
 * 1. components/dashboard/hybrid-dashboard-wrapper.tsx (lines 89, 107)
 *    - Uses JSON.stringify() to embed portfolio/price data
 *    - Data comes from server-side prefetch (trusted source)
 *    - VERDICT: ✅ SAFE - JSON encoding prevents XSS
 * 
 * 2. components/ui/ai-chat.tsx (line 1267)
 *    - Uses formatMarkdown() which escapes HTML first
 *    - VERDICT: ✅ SAFE - HTML is escaped before markdown processing
 * 
 * 3. components/ui/ai-chat.tsx (line 1146)
 *    - Inline CSS styles only (no user input)
 *    - VERDICT: ✅ SAFE - Static CSS content
 * 
 * 4. app/layout.tsx (line 87)
 *    - Uses JSON.stringify() for environment variables
 *    - VERDICT: ✅ SAFE - JSON encoding prevents XSS
 * 
 * All usages have been audited and are safe as of December 2024.
 */
