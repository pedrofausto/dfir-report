import dompurify from 'dompurify';

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
 * Helper to convert our custom config to DOMPurify config
 */
function mapConfigToDOMPurify(config: SanitizationConfig = DEFAULT_CONFIG): any {
  // Always use the default config as a base to ensure essential tags are allowed
  const effectiveTags = config.allowedTags || DEFAULT_CONFIG.allowedTags || [];

  // Combine allowed attributes
  const allowedAttrs: string[] = [];
  const effectiveAttrs = config.allowedAttributes || DEFAULT_CONFIG.allowedAttributes || {};

  // Collect all attributes into a single list as DOMPurify ALLOWED_ATTR is a string[]
  Object.values(effectiveAttrs).forEach(attrs => {
    attrs.forEach(attr => {
      if (!allowedAttrs.includes(attr)) {
        allowedAttrs.push(attr);
      }
    });
  });

  return {
    ALLOWED_TAGS: effectiveTags,
    ALLOWED_ATTR: allowedAttrs,
    ALLOW_DATA_ATTR: false, // Disallow data-* attributes by default
    ADD_ATTR: ['target'], // Ensure target is allowed for links
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'applet', 'meta', 'link', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'oninput', 'onchange'],
    KEEP_CONTENT: true, // Keep content of removed tags
    WHOLE_DOCUMENT: false, // We usually sanitize fragments
  };
}

// Initialize DOMPurify instance
let DOMPurify: any;

function initDOMPurify() {
    if (DOMPurify) return;

    if (typeof dompurify === 'function') {
        if (typeof window !== 'undefined') {
            DOMPurify = dompurify(window);
        } else {
             // Fallback for tests if window is missing but dompurify factory exists
             // (Should not happen in jsdom env)
             DOMPurify = dompurify;
        }
    } else {
        DOMPurify = dompurify;
    }
}

// Track custom removals per call
let customRemovedCount = 0;

function setupHooks() {
    if (!DOMPurify || DOMPurify._hooksSetup) return;

    // Hook to block dangerous protocols in attributes
    DOMPurify.addHook('uponSanitizeAttribute', (node: Element, data: any) => {
        if (data.attrName && (data.attrName === 'src' || data.attrName === 'href' || data.attrName === 'action' || data.attrName === 'formaction')) {
            const value = data.attrValue.toLowerCase().trim();
            // Block dangerous protocols including data:
            if (value.startsWith('data:') || value.startsWith('javascript:') || value.startsWith('vbscript:')) {
                data.attrValue = '';
                node.removeAttribute(data.attrName);
                customRemovedCount++;
            }
        }
    });

    // Use uponSanitizeElement to catch tags that are about to be removed
    // JSDOM/DOMPurify interaction seems fragile for 'beforeSanitizeElements' or it's not being hit for stripped tags?
    // Let's try checking if the tag is valid but NOT allowed.
    DOMPurify.addHook('uponSanitizeElement', (node: Element, data: any) => {
        if (!node.tagName) return;
        const tagName = node.tagName.toUpperCase();

        // Check for forbidden tags.
        // If the tag is forbidden, DOMPurify normally removes it.
        // We want to count it.
        if (['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'APPLET', 'META', 'LINK', 'STYLE'].includes(tagName)) {
             customRemovedCount++;
        }
    });

    DOMPurify._hooksSetup = true;
}

/**
 * Sanitize HTML content to prevent XSS attacks using DOMPurify
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

  initDOMPurify();

  if (!DOMPurify || typeof DOMPurify.sanitize !== 'function') {
      console.error("DOMPurify not initialized properly");
      return { sanitized: '', removed: 0, isClean: false };
  }

  try {
    setupHooks();

    // Reset counters
    customRemovedCount = 0;

    const domPurifyConfig = mapConfigToDOMPurify(config);

    // Sanitize
    const sanitized = DOMPurify.sanitize(html, {
        ...domPurifyConfig,
        WHOLE_DOCUMENT: false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
    }) as string;

    // DOMPurify.removed is an array of elements removed in the last call
    // Filter out implicit body/head removals that happen in JSDOM environments for fragments
    const domPurifyRemoved = DOMPurify.removed ? DOMPurify.removed.filter((item: any) => {
        // If it's a body tag and we are sanitizing a fragment, ignore it
        if (item.element && (item.element.tagName === 'BODY' || item.element.tagName === 'HEAD')) {
             return false;
        }
        return true;
    }) : [];

    // Avoid double counting if DOMPurify actually reports these tags in .removed
    // Ideally we'd check if `domPurifyRemoved` contains the elements we counted in `customRemovedCount`.
    // But since `customRemovedCount` is just a number, we can't dedup easily.
    // However, our observations showed DOMPurify.removed was empty for script tags.
    // So simple addition is likely correct for now.

    const domPurifyRemovedCount = domPurifyRemoved.length;

    const totalRemoved = domPurifyRemovedCount + customRemovedCount;

    return {
      sanitized,
      removed: totalRemoved,
      isClean: totalRemoved === 0
    };
  } catch (error) {
    console.error('Sanitization error:', error);
    // Fail safe
    return {
      sanitized: '',
      removed: 0,
      isClean: false
    };
  }
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
