/**
 * Configuration for HTML sanitization
 */
export interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripHtmlBrackets?: boolean;
}

/**
 * Result of HTML sanitization operation
 */
export interface SanitizationResult {
  /** Sanitized HTML string */
  sanitized: string;
  /** Number of dangerous elements removed */
  removed: number;
  /** Whether HTML is clean (no removals) */
  isClean: boolean;
}

/**
 * Default sanitization configuration
 * Allows safe HTML tags commonly used in reports
 */
const DEFAULT_CONFIG: SanitizationConfig = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'strong', 'em', 'u', 'b', 'i',
    'a', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'pre', 'code', 'div', 'span',
    'img', 'hr', 'section', 'article', 'nav',
    'header', 'footer', 'main', 'aside', 'details', 'summary',
    'svg', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'width', 'height', 'title'],
    'table': ['border', 'cellpadding', 'cellspacing'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
    'div': ['class', 'id'],
    'span': ['class', 'id'],
    'svg': ['viewBox', 'width', 'height', 'xmlns'],
    'path': ['d', 'stroke', 'fill', 'stroke-width'],
    '*': ['class', 'id', 'style']
  }
};

/**
 * Regular expressions to detect and remove dangerous patterns
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^\s>]*/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /(expression\s*\()/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<applet/gi,
  /<meta/gi,
  /<link/gi,
  /<style[^>]*>[\s\S]*?<\/style>/gi,
  /formaction\s*=/gi,
  /onfocus\s*=/gi,
  /onblur\s*=/gi,
  /onchange\s*=/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onmouseover\s*=/gi,
  /onmouseout\s*=/gi,
  /onclick\s*=/gi,
  /ondblclick\s*=/gi,
  /onkeydown\s*=/gi,
  /onkeyup\s*=/gi,
  /oninput\s*=/gi,
  /onwheel\s*=/gi,
  /onmousedown\s*=/gi,
  /onmouseup\s*=/gi,
  /onmousemove\s*=/gi,
  /ondrag\s*=/gi,
  /ondrop\s*=/gi,
  /data:text\/html/gi,
  /data:application\/javascript/gi
];

/**
 * Check if HTML contains dangerous content
 */
function hasDangerousContent(html: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(html));
}

/**
 * Remove dangerous patterns from HTML
 */
function removeDangerousPatterns(html: string): { cleaned: string; removed: number } {
  let cleaned = html;
  let removed = 0;

  // Remove script tags and content
  const scriptMatches = cleaned.match(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);
  if (scriptMatches) {
    removed += scriptMatches.length;
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  // Remove event handlers with quoted values
  const eventMatches = cleaned.match(/on\w+\s*=\s*["'][^"']*["']/gi);
  if (eventMatches) {
    removed += eventMatches.length;
    cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  }

  // Remove inline event handlers without quotes
  const eventMatches2 = cleaned.match(/on\w+\s*=\s*(?!["'])[^\s>]*/gi);
  if (eventMatches2) {
    removed += eventMatches2.length;
    cleaned = cleaned.replace(/on\w+\s*=\s*(?!["'])[^\s>]*/gi, '');
  }

  // Remove dangerous protocols in URLs (javascript:, vbscript:, data:text/html, etc.)
  // This matches the protocol prefix and removes it
  const protocolMatches = cleaned.match(/(?:javascript|vbscript|data:text\/html|data:application\/javascript):/gi);
  if (protocolMatches) {
    removed += protocolMatches.length;
    cleaned = cleaned.replace(/(?:javascript|vbscript|data:text\/html|data:application\/javascript):/gi, '');
  }

  // Remove data URLs in attributes more aggressively
  // Remove href="data:text/html..." patterns
  const dataUrlMatches = cleaned.match(/(?:href|src|action)\s*=\s*["']data:(?:text\/html|application\/javascript)[^"']*["']/gi);
  if (dataUrlMatches) {
    removed += dataUrlMatches.length;
    cleaned = cleaned.replace(/(?:href|src|action)\s*=\s*["']data:(?:text\/html|application\/javascript)[^"']*["']/gi, '');
  }

  // Remove dangerous tags
  const dangerousTagMatches = cleaned.match(/<(script|iframe|object|embed|applet|link|meta)\b[^>]*>/gi);
  if (dangerousTagMatches) {
    removed += dangerousTagMatches.length;
    cleaned = cleaned.replace(/<(script|iframe|object|embed|applet|link|meta)\b[^>]*>/gi, '');
  }

  // Remove closing tags for dangerous elements
  cleaned = cleaned.replace(/<\/(script|iframe|object|embed|applet|link|meta)>/gi, '');

  return { cleaned, removed };
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes dangerous patterns and tags
 *
 * @param html - Raw HTML string to sanitize
 * @param config - Optional custom sanitization config
 * @returns SanitizationResult with sanitized HTML and metadata
 */
export function sanitizeHtml(
  html: string | null | undefined,
  config?: SanitizationConfig
): SanitizationResult {
  // Handle null/undefined input
  if (!html) {
    return {
      sanitized: '',
      removed: 0,
      isClean: true
    };
  }

  try {
    // Store original HTML for comparison
    const originalHtml = html;

    // Remove dangerous patterns
    const { cleaned, removed } = removeDangerousPatterns(html);

    return {
      sanitized: cleaned,
      removed,
      isClean: cleaned === originalHtml
    };
  } catch (error) {
    // If sanitization fails, return safe content
    console.error('Sanitization error:', error);
    return {
      sanitized: '',
      removed: 0,
      isClean: false
    };
  }
}

/**
 * Flatten allowed attributes object into array format
 * @param allowedAttrs - Map of tag -> attributes
 * @returns Flattened array of "tag::attr" format
 */
function flattenAllowedAttributes(
  allowedAttrs: Record<string, string[]>
): string[] {
  const flattened: string[] = [];

  for (const [tag, attrs] of Object.entries(allowedAttrs)) {
    for (const attr of attrs) {
      if (tag === '*') {
        flattened.push(attr);
      } else {
        flattened.push(`${tag}::${attr}`);
      }
    }
  }

  return flattened;
}

/**
 * Log significant sanitization events
 * Only logs when dangerous content was removed
 *
 * @param source - Source identifier (component or file name)
 * @param result - Sanitization result
 */
export function logSanitizationEvent(
  source: string,
  result: SanitizationResult
): void {
  // Only log significant removals
  if (result.removed > 0) {
    console.log(
      `[SECURITY] Sanitization event in ${source}: Removed ${result.removed} dangerous element(s)`
    );
  }
}
