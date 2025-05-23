// Book configuration and settings file
// Adjust these values for debugging and customization

// Overall book settings
export const MAX_PAGES = 50 // 25 spreads (left and right pages)
export const CHARS_PER_PAGE = 335 // Minecraft allows around 256 characters per page

// Text layout configuration - Common between modes
export const MIN_FONT_SIZE = 14
export const MAX_FONT_SIZE = 48
export const PADDING_VERTICAL = 0

// Key consistency settings - MAINTAIN THE SAME VALUES IN BOTH MODES
// This ensures text doesn't reflow when toggling modes
const CONSISTENT_CHARS_PER_LINE = 27  // Same character count per line in both modes
const CONSISTENT_LINES_PER_PAGE = 12  // Same line count per page in both modes

// Regular mode (editor disabled) - Full-size book
export const REGULAR_MODE = {
  charsPerLine: CONSISTENT_CHARS_PER_LINE,  // Consistent between modes
  linesPerPage: CONSISTENT_LINES_PER_PAGE,  // Consistent between modes
  fillFactor: 0.85,     // Scale factor for font size
  bookScale: 1,         // Book container scale
}

// Editor mode - Smaller book when editor is enabled 
export const EDITOR_MODE = {
  charsPerLine: CONSISTENT_CHARS_PER_LINE,  // Same as regular mode
  linesPerPage: CONSISTENT_LINES_PER_PAGE,  // Same as regular mode
  fillFactor: 0.85,     // Same fill factor to maintain consistent font sizing algorithm
  bookScale: 1,       // Scale of book container only (80% of regular size)
}

// Mobile mode - Optimized for small screens
export const MOBILE_MODE = {
  charsPerLine: 22, 
  linesPerPage: 11,       // Allow lines on mobile
  fillFactor: 0.85,        // Use all available space for text
  bookScale: 1,            // Full scale for mobile
  chars_per_page: 252      // the mobile has a limit of 252
}

// Consistent text styling
export const TEXT_STYLE = {
  lineHeightFactor: 1.05,  // Tighter line height for all modes (was 1.2)
  letterSpacing: "0.02em",
  color: "#3F3F3F",
  fontFamily: "var(--font-pixel), 'Minecraft', monospace !important",
}

// Export settings
export const EXPORT_SETTINGS = {
  scale: 2,              // Export resolution scale
  delayBetweenExports: 300, // ms between saving each image
  renderDelay: 500,      // ms to wait for rendering before capture
  useRegularMode: true,  // Always use regular mode sizing for exports
}