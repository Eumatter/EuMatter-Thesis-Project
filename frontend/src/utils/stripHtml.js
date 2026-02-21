/**
 * Strips HTML tags from a string and returns plain text.
 * Use when displaying rich-text/HTML content as plain text (e.g. event descriptions).
 * @param {string} html - String that may contain HTML tags
 * @returns {string} Plain text with tags removed, whitespace normalized
 */
export function stripHtml(html) {
    if (html == null || html === '') return '';
    const text = String(html)
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return text;
}
