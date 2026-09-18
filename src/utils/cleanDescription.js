/**
 * cleanDescription.js
 * ====================
 * SECURITY ADVISORY:
 * -------------------
 * This utility is strictly an ERGONOMIC PLAIN-TEXT FORMATTER intended for formatting
 * raw scraped/scanned job postings for safe standard React JSX text interpolation
 * (e.g. `{job.description}`, form textareas, or plain-text embeddings).
 *
 * It is NOT an HTML sanitizer and MUST NEVER be trusted to produce safe HTML strings
 * for `dangerouslySetInnerHTML`, `element.innerHTML`, or `eval()`. Standard React JSX
 * automatically escapes HTML entities at render time.
 *
 * PIPELINE STAGES:
 * 1. Strip script, style, and iframe blocks entirely to avoid leaking executable code or CSS into text.
 * 2. Convert block-level structural tags (<br>, <p>, <div>, <li>) to semantic line breaks and bullet points.
 * 3. Strip all residual HTML tags.
 * 4. Decode HTML entities into human-readable plain text characters (DOMParser or fallback map).
 * 5. Re-strip any residual HTML tags unmasked by entity decoding.
 * 6. Clean non-breaking spaces, trim lines, and collapse excessive newlines into readable paragraphs.
 */

export function cleanJobDescription(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return 'No description available.';
  }

  let text = rawText;

  // 1. Remove dangerous script, style, iframe, object, embed, and svg blocks completely
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  text = text.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  text = text.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

  // 2. Convert HTML block tags to newlines and bullet points
  text = text.replace(/<\s*br\s*\/?>/gi, '\n');
  text = text.replace(/<\s*\/?\s*(?:p|div|section|article|header|footer|h[1-6])\b[^>]*>/gi, '\n');
  text = text.replace(/<\s*li\b[^>]*>/gi, '\n• ');
  text = text.replace(/<\s*\/?\s*(?:ul|ol)\b[^>]*>/gi, '\n');

  // 3. Strip initial HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 4. Decode HTML entities via DOMParser when available in browser
  if (typeof globalThis.DOMParser === 'function') {
    try {
      const doc = new globalThis.DOMParser().parseFromString(text, 'text/html');
      text = (doc && doc.body && doc.body.textContent) ? doc.body.textContent : text;
    } catch (e) {
      if (e instanceof TypeError || e instanceof ReferenceError) {
        throw e;
      }
    }
  }

  // 5. Fallback entity replacement after tags are stripped
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ');

  // 6. Clean non-breaking spaces and unicode artifacts
  text = text.replace(/\u00a0/g, ' ');

  // 7. Normalize lines and whitespace
  const lines = text.split('\n').map(l => l.trim());
  const normalized = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return normalized || 'No description available.';
}
