/**
 * DyslexiaTheme.ts
 * 
 * A centralized dyslexia-friendly color palette and typography system.
 * 
 * Principles:
 * - Avoid pure white (#FFFFFF) and pure black (#000000)
 * - Use soft pastel backgrounds that reduce visual stress
 * - Dark (but not black) text on light backgrounds for max readability
 * - Muted, harmonious accent colors — no neon or high-saturation tones
 * - Increased line height and letter spacing for text readability
 * - Simple, uncluttered layouts
 */

export const DT = {
  // ─── BACKGROUND COLOURS ──────────────────────────────────────────────────────
  // Core app backgrounds — soft, glare-free, calming
  bg: {
    cream:      '#FAF6F0',   // Primary bg — warm cream (best for dyslexia)
    parchment:  '#F5EFE4',   // Slightly darker cream for card backgrounds
    skyBlue:    '#EEF4FB',   // Calm sky-blue for tracing / activity screens
    lemon:      '#FEFCE8',   // Pale lemon — reduces visual stress
    sage:       '#F0F7F0',   // Soft sage green — calming alternative
    stone:      '#F4F2EE',   // Warm beige / stone for neutral screens
    lavender:   '#F3F1FA',   // Gentle lavender for game screens
    blush:      '#FDF1F4',   // Soft blush for auth / register screens
  },

  // ─── TEXT COLOURS ─────────────────────────────────────────────────────────────
  // Dark but NOT pure black — easier on dyslexic readers
  text: {
    primary:    '#2C2417',   // Warm dark brown — replaces #000000
    secondary:  '#5C4F3A',   // Medium brown — replaces #475569 etc.
    muted:      '#8C7B65',   // Light brown for captions / hints
    onDark:     '#FAF6F0',   // Cream for text on dark backgrounds
    onAccent:   '#1A1A1A',   // Near-black for text on accent coloured elements
    link:       '#3D6B9E',   // Muted blue link colour
    error:      '#B03A2E',   // Muted red for errors (not bright red)
    success:    '#2E7D32',   // Muted green for success
  },

  // ─── ACCENT / INTERACTIVE COLOURS ────────────────────────────────────────────
  // Module-specific accent colours — muted versions of vibrant hues
  accent: {
    indigo:     '#5B6EC8',   // Muted indigo (replaces #4F46E5)
    teal:       '#2E8B7A',   // Muted teal (replaces #10B981)
    amber:      '#C17D2A',   // Muted amber (replaces #D97706)
    navy:       '#2E4A7A',   // Muted navy (replaces #2b5876)
    rose:       '#B85270',   // Muted rose (replaces #F43F5E / #DB2777)
    violet:     '#7055A8',   // Muted violet (replaces #8B5CF6)
    sky:        '#3B7CB5',   // Muted sky blue (replaces #0EA5E9)
    green:      '#4A8A5A',   // Muted green
    coral:      '#C46B55',   // Muted coral (replaces bright #FF6B6B)
    gold:       '#B8962E',   // Warm gold for highlights
  },

  // ─── CARD / SURFACE COLOURS ───────────────────────────────────────────────────
  surface: {
    card:       '#FFFCF7',   // Warm white for cards
    cardBorder: '#E8DDD0',   // Warm border
    input:      '#F8F3EC',   // Input field background
    inputBorder:'#D5C9B8',   // Input border
    divider:    '#E8DDD0',   // Divider lines
    overlay:    'rgba(44, 36, 23, 0.45)',  // Dark brown overlay (replaces black)
    softOverlay:'rgba(44, 36, 23, 0.15)',  // Very subtle overlay
  },

  // ─── GRADIENTS (as tuples for LinearGradient) ─────────────────────────────────
  gradient: {
    cream:      ['#FAF6F0', '#F5EFE4'] as const,
    sky:        ['#EEF4FB', '#E0EEF8'] as const,
    sage:       ['#F0F7F0', '#E4F0E4'] as const,
    lemon:      ['#FEFCE8', '#FFF8D0'] as const,
    warmCard:   ['#FFFCF7', '#F8F0E4'] as const,
    navyHero:   ['rgba(46,74,122,0.88)', 'rgba(46,74,122,0.45)'] as const,
    indigoHero: ['rgba(91,110,200,0.88)', 'rgba(91,110,200,0.45)'] as const,
    tealHero:   ['rgba(46,139,122,0.88)', 'rgba(46,139,122,0.45)'] as const,
  },

  // ─── SHADOWS ──────────────────────────────────────────────────────────────────
  shadow: {
    soft: {
      shadowColor: '#2C2417',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    medium: {
      shadowColor: '#2C2417',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
  },

  // ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────
  typography: {
    // Line heights — increased for dyslexia readability
    lineHeightBody:    26,
    lineHeightLarge:   32,
    // Letter spacing — subtle increase improves readability
    letterSpacingBody: 0.3,
    letterSpacingUI:   0.5,
    // Font weights — avoid ultra-thin weights
    weightRegular:     '400' as const,
    weightMedium:      '600' as const,
    weightBold:        '700' as const,
    weightHeavy:       '800' as const,
  },

  // ─── BORDER RADII ─────────────────────────────────────────────────────────────
  radius: {
    sm:   8,
    md:   12,
    lg:   18,
    xl:   24,
    pill: 50,
  },

  // ─── SPACING ──────────────────────────────────────────────────────────────────
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },
} as const;

export type DyslexiaTheme = typeof DT;
