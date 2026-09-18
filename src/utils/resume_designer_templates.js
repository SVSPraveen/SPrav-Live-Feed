/**
 * resume_designer_templates.js
 * =============================
 * Premium multi-template styling engine for the ATS Resume Studio.
 *
 * Provides three distinct, production-grade archetypes matching the visual
 * quality of paid subscription platforms and creative design suites:
 *
 *  1. Ivy Classic Serif   — Harvard / finance / law-firm aesthetic
 *  2. Silicon Valley Modern — Startup / FAANG / clean tech aesthetic
 *  3. High-Density 1-Page  — Maximum content density for senior engineers
 *
 * Each template exposes a full CSS-in-JS styles object used directly by
 * the live resume preview in AtsResumeStudio.jsx, plus PDF layout tokens
 * consumed by the ats_pdf_compiler.js renderer.
 */

export const RESUME_TEMPLATES = [
  {
    id: 'jakes_resume',
    name: "Jake's Resume / Harvard Standard",
    tagline: 'Canonical Single-Column ATS Gold Standard',
    defaultFont: 'inter',
    defaultColor: 'charcoal',
    description:
      'The universally recognized gold standard across Workday, Greenhouse, and Lever. Strict 0.5" margins, centered 18pt bold header, right-aligned dates on exact same line, edge-to-edge section dividers.',
    features: ['100/100 ATS Score', '0.5" Canonical Margins', 'Right-Aligned Dates', 'Canonical Divider Rules'],
    pdfVariant: 'jakes',
    atsSafe: true,
    supportsPhoto: false,
  },
  {
    id: 'ivy_classic',
    name: 'Ivy Classic Serif',
    tagline: 'Harvard / Wall Street Standard',
    defaultFont: 'merriweather',
    defaultColor: 'charcoal',
    description:
      'Timeless serif typography with traditional horizontal rules. Unsurpassed single-column ATS parse rate across enterprise and FAANG scanners.',
    features: ['100% ATS Safe', 'Serif Hierarchy', 'Centered Academic Header', 'Rule Dividers'],
    pdfVariant: 'ivy',
    atsSafe: true,
    supportsPhoto: false,
  },
  {
    id: 'modern_tech',
    name: 'Silicon Valley Modern',
    tagline: 'Contemporary Tech & Startup',
    defaultFont: 'inter',
    defaultColor: 'navy',
    description:
      'Crisp geometric sans-serif with bold left-aligned header, thick colored section accent bars, and pill-style skill tags.',
    features: ['Clean Sans-Serif', 'Accent Bars', 'Left-Aligned Header', 'Pill Skill Tags'],
    pdfVariant: 'modern',
    atsSafe: true,
    supportsPhoto: false,
  },
  {
    id: 'high_density',
    name: 'High-Density 1-Page',
    tagline: 'Maximum Space Optimization',
    defaultFont: 'roboto',
    defaultColor: 'slate',
    description:
      'Engineered for senior engineers with 5+ years of achievements, tight leading, inline metadata, and maximum printable-area utilization.',
    features: ['Strict 1-Page Fit', 'Compact Leading', 'Inline Metadata', 'Max Printable Area'],
    pdfVariant: 'dense',
    atsSafe: true,
    supportsPhoto: false,
  },
  {
    id: 'overleaf_latex',
    name: 'Academic LaTeX',
    tagline: 'Overleaf / Computer Modern Style',
    defaultFont: 'computer_modern',
    defaultColor: 'charcoal',
    description:
      'Formal Computer Modern typography with mathematical proportions, uppercase spaced headers, and clean horizontal line breaks favored by researchers and engineers.',
    features: ['100% ATS Safe', 'LaTeX Proportions', 'Computer Modern', 'Research Standard'],
    pdfVariant: 'latex',
    atsSafe: true,
    supportsPhoto: false,
  },
  {
    id: 'creative_sidebar',
    name: 'Creative Two-Column',
    tagline: 'Dual-Column Creative Pro',
    defaultFont: 'inter',
    defaultColor: 'navy',
    description:
      'Modern asymmetric two-column layout with customizable accent sidebar, circular user avatar, contact info, skill tags, and education alongside a primary experience column.',
    features: ['Profile Photo', 'Sidebar Layout', 'Skill Meters', 'European / Creative Standard'],
    pdfVariant: 'creative',
    atsSafe: false,
    supportsPhoto: true,
  },
  {
    id: 'executive_minimal',
    name: 'Executive Minimalist',
    tagline: 'High-Impact Swiss Typography',
    defaultFont: 'space_grotesk',
    defaultColor: 'slate',
    description:
      'Refined Swiss design with generous breathing room, high-contrast headings, and subtle slate divider lines for leadership, senior architects, and directors.',
    features: ['100% ATS Safe', 'Swiss Minimalist', 'High Contrast', 'Leadership Standard'],
    pdfVariant: 'executive',
    atsSafe: true,
    supportsPhoto: false,
  },
];

export const RESUME_FONTS = [
  {
    id: 'merriweather',
    name: 'Merriweather',
    family: "'Merriweather', Georgia, 'Times New Roman', serif",
    category: 'Serif',
  },
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter', system-ui, -apple-system, sans-serif",
    category: 'Modern Sans',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    family: "'Roboto', Arial, Helvetica, sans-serif",
    category: 'Clean Sans',
  },
  {
    id: 'space_grotesk',
    name: 'Space Grotesk',
    family: "'Space Grotesk', system-ui, sans-serif",
    category: 'Tech Display',
  },
  {
    id: 'computer_modern',
    name: 'Computer Modern (LaTeX)',
    family: '"Latin Modern Roman", "CMU Serif", "Computer Modern", "Times New Roman", Georgia, serif',
    category: 'LaTeX Serif',
  },
];

export const RESUME_COLORS = [
  {
    id: 'charcoal',
    name: 'Classic Charcoal',
    primary: '#0f172a',
    accent: '#334155',
    muted: '#64748b',
    border: '#cbd5e1',
    ruleColor: '#94a3b8',
    accentBar: '#0f172a',
    pillBg: 'rgba(15, 23, 42, 0.07)',
    pillText: '#0f172a',
    pillBorder: 'rgba(15, 23, 42, 0.18)',
    pdfRgb: [0.06, 0.09, 0.16],
  },
  {
    id: 'navy',
    name: 'Tech Navy',
    primary: '#1e3a8a',
    accent: '#2563eb',
    muted: '#3b82f6',
    border: '#bfdbfe',
    ruleColor: '#93c5fd',
    accentBar: '#1e40af',
    pillBg: 'rgba(30, 58, 138, 0.08)',
    pillText: '#1e3a8a',
    pillBorder: 'rgba(37, 99, 235, 0.3)',
    pdfRgb: [0.12, 0.23, 0.54],
  },
  {
    id: 'emerald',
    name: 'Forest Emerald',
    primary: '#065f46',
    accent: '#059669',
    muted: '#10b981',
    border: '#a7f3d0',
    ruleColor: '#6ee7b7',
    accentBar: '#047857',
    pillBg: 'rgba(5, 150, 105, 0.08)',
    pillText: '#065f46',
    pillBorder: 'rgba(5, 150, 105, 0.3)',
    pdfRgb: [0.02, 0.37, 0.27],
  },
  {
    id: 'slate',
    name: 'Slate Steel',
    primary: '#1e293b',
    accent: '#475569',
    muted: '#64748b',
    border: '#94a3b8',
    ruleColor: '#94a3b8',
    accentBar: '#334155',
    pillBg: 'rgba(71, 85, 105, 0.08)',
    pillText: '#1e293b',
    pillBorder: 'rgba(71, 85, 105, 0.3)',
    pdfRgb: [0.12, 0.16, 0.23],
  },
  {
    id: 'burgundy',
    name: 'Burgundy Wine',
    primary: '#881337',
    accent: '#be123c',
    muted: '#e11d48',
    border: '#fecdd3',
    ruleColor: '#fda4af',
    accentBar: '#9f1239',
    pillBg: 'rgba(136, 19, 55, 0.08)',
    pillText: '#881337',
    pillBorder: 'rgba(190, 18, 60, 0.3)',
    pdfRgb: [0.53, 0.07, 0.22],
  },
];

export const RESUME_DENSITIES = [
  {
    id: 'compact',
    name: 'Compact (1-Page Fit)',
    padding: '28px 36px',
    lineSpacing: '1.28',
    sectionGap: '11px',
    itemGap: '5px',
    bulletGap: '2.5px',
    fontSizeBase: '8.6px',
    fontSizeSub: '8.2px',
    titleSize: '18px',
    subtitleSize: '9.5px',
    headingSize: '9px',
    nameLetterSpacing: '1.8px',
  },
  {
    id: 'standard',
    name: 'Standard (Balanced)',
    padding: '36px 46px',
    lineSpacing: '1.42',
    sectionGap: '15px',
    itemGap: '8px',
    bulletGap: '3px',
    fontSizeBase: '9.5px',
    fontSizeSub: '9px',
    titleSize: '21px',
    subtitleSize: '10.5px',
    headingSize: '10px',
    nameLetterSpacing: '2px',
  },
  {
    id: 'relaxed',
    name: 'Relaxed (Executive)',
    padding: '44px 54px',
    lineSpacing: '1.52',
    sectionGap: '20px',
    itemGap: '12px',
    bulletGap: '4px',
    fontSizeBase: '10.5px',
    fontSizeSub: '9.8px',
    titleSize: '24px',
    subtitleSize: '12px',
    headingSize: '11px',
    nameLetterSpacing: '2.5px',
  },
];

/**
 * Returns computed styles and design tokens for the given configuration.
 * Used by the live preview in AtsResumeStudio.jsx and also exported to
 * the PDF compiler for layout-aware rendering.
 */
export function getTemplateTokens({
  templateId = 'ivy_classic',
  fontId = 'merriweather',
  colorId = 'charcoal',
  densityId = 'standard',
} = {}) {
  const template = RESUME_TEMPLATES.find((t) => t.id === templateId) || RESUME_TEMPLATES.find((t) => t.id === 'ivy_classic') || RESUME_TEMPLATES[0];
  const font = RESUME_FONTS.find((f) => f.id === fontId) || RESUME_FONTS[0];
  const color = RESUME_COLORS.find((c) => c.id === colorId) || RESUME_COLORS[0];
  const density = RESUME_DENSITIES.find((d) => d.id === densityId) || RESUME_DENSITIES[1];

  const isJakes = templateId === 'jakes_resume';
  const isIvy = templateId === 'ivy_classic';
  const isModern = templateId === 'modern_tech';
  const isDense = templateId === 'high_density';
  const isLatex = templateId === 'overleaf_latex';
  const isCreative = templateId === 'creative_sidebar';
  const isExecutive = templateId === 'executive_minimal';
  const isTwoColumn = isCreative;

  // --- Section header visual styles per template ---
  let sectionHeaderStyle;
  if (isJakes) {
    sectionHeaderStyle = {
      fontSize: density.headingSize,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: color.primary,
      letterSpacing: '1.2px',
      borderBottom: `1px solid ${color.primary}`,
      paddingBottom: '2px',
      marginBottom: density.itemGap,
      lineHeight: '1.2',
    };
  } else if (isModern) {
    sectionHeaderStyle = {
      fontSize: density.headingSize,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: color.primary,
      letterSpacing: '1px',
      padding: '3px 0 3px 9px',
      borderLeft: `3.5px solid ${color.accentBar}`,
      marginBottom: density.itemGap,
      lineHeight: '1.2',
    };
  } else if (isIvy) {
    sectionHeaderStyle = {
      fontSize: density.headingSize,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: color.primary,
      letterSpacing: '1.4px',
      borderBottom: `1.5px solid ${color.ruleColor}`,
      paddingBottom: '3px',
      marginBottom: density.itemGap,
      lineHeight: '1.2',
    };
  } else if (isLatex) {
    sectionHeaderStyle = {
      fontSize: density.headingSize,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: color.primary,
      letterSpacing: '1.6px',
      borderBottom: `1px solid ${color.primary}`,
      paddingBottom: '2px',
      marginBottom: density.itemGap,
      lineHeight: '1.2',
    };
  } else if (isCreative) {
    sectionHeaderStyle = {
      fontSize: density.headingSize,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: color.primary,
      letterSpacing: '0.8px',
      borderBottom: `2px solid ${color.accent}`,
      paddingBottom: '3px',
      marginBottom: density.itemGap,
      lineHeight: '1.2',
    };
  } else if (isExecutive) {
    sectionHeaderStyle = {
      fontSize: density.headingSize,
      fontWeight: 800,
      textTransform: 'uppercase',
      color: color.primary,
      letterSpacing: '1.5px',
      borderBottom: `2.5px solid ${color.accentBar}`,
      paddingBottom: '4px',
      marginBottom: density.itemGap,
      lineHeight: '1.2',
    };
  } else {
    // isDense
    sectionHeaderStyle = {
      fontSize: density.headingSize,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: color.primary,
      letterSpacing: '0.9px',
      borderBottom: `2px double ${color.ruleColor}`,
      paddingBottom: '2px',
      marginBottom: density.itemGap,
      lineHeight: '1.2',
    };
  }

  let headerStyle;
  if (isJakes) {
    headerStyle = {
      textAlign: 'center',
      marginBottom: density.sectionGap,
      paddingBottom: '4px',
    };
  } else if (isModern) {
    headerStyle = {
      textAlign: 'left',
      marginBottom: density.sectionGap,
      borderBottom: `3px solid ${color.primary}`,
      paddingBottom: '12px',
    };
  } else if (isIvy) {
    headerStyle = {
      textAlign: 'center',
      marginBottom: density.sectionGap,
      borderBottom: `1px solid ${color.ruleColor}`,
      paddingBottom: '10px',
    };
  } else if (isLatex) {
    headerStyle = {
      textAlign: 'center',
      marginBottom: density.sectionGap,
      borderBottom: `1.2px solid ${color.primary}`,
      paddingBottom: '8px',
    };
  } else if (isCreative) {
    headerStyle = {
      textAlign: 'left',
      marginBottom: density.sectionGap,
      borderBottom: `1.5px solid ${color.border}`,
      paddingBottom: '10px',
    };
  } else if (isExecutive) {
    headerStyle = {
      textAlign: 'left',
      marginBottom: density.sectionGap,
      borderBottom: `3px solid ${color.primary}`,
      paddingBottom: '14px',
    };
  } else {
    headerStyle = {
      textAlign: 'left',
      marginBottom: density.sectionGap,
      borderBottom: `1.5px solid ${color.ruleColor}`,
      paddingBottom: '8px',
    };
  }

  return {
    template,
    font,
    color,
    density,
    isJakes,
    isIvy,
    isModern,
    isDense,
    isLatex,
    isCreative,
    isExecutive,
    isTwoColumn,
    styles: {
      twoColumnGrid: isTwoColumn ? {
        display: 'grid',
        gridTemplateColumns: '190px 1fr',
        gap: '20px',
        alignItems: 'start'
      } : null,
      sidebar: isTwoColumn ? {
        background: 'rgba(15, 23, 42, 0.03)',
        borderRight: `1px solid ${color.border}`,
        padding: '14px 12px',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: density.sectionGap
      } : null,
      mainCol: isTwoColumn ? {
        display: 'flex',
        flexDirection: 'column'
      } : null,
      avatarContainer: {
        width: '74px',
        height: '74px',
        borderRadius: '50%',
        overflow: 'hidden',
        margin: isModern ? '0 0 10px 0' : '0 auto 12px auto',
        border: `2.5px solid ${color.accent}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: color.pillBg,
        flexShrink: 0
      },
      avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      },
      avatarFallback: {
        fontSize: '24px',
        fontWeight: 800,
        color: color.accent,
        textTransform: 'uppercase'
      },
      container: {
        background: '#ffffff',
        color: '#1e293b',
        borderRadius: '6px',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.38)',
        padding: density.padding,
        fontFamily: font.family,
        minHeight: '850px',
        lineHeight: density.lineSpacing,
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
      },
      header: headerStyle,
      name: {
        fontSize: density.titleSize,
        fontWeight: 800,
        color: color.primary,
        letterSpacing: density.nameLetterSpacing,
        textTransform: 'uppercase',
        lineHeight: '1.1',
        marginBottom: '3px',
      },
      subtitle: {
        fontSize: density.subtitleSize,
        fontWeight: isModern ? 600 : 500,
        color: color.accent,
        letterSpacing: isIvy ? '0.5px' : '0.2px',
        marginBottom: '5px',
        textTransform: isModern ? 'uppercase' : 'none',
        fontStyle: isIvy ? 'italic' : 'normal',
      },
      contactRow: {
        fontSize: density.fontSizeSub,
        color: '#475569',
        marginTop: '4px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: isModern ? 'flex-start' : 'center',
        gap: '6px',
        alignItems: 'center',
      },
      contactSep: {
        color: color.muted,
        opacity: 0.55,
        fontSize: density.fontSizeSub,
      },
      sectionHeader: sectionHeaderStyle,
      section: {
        marginBottom: density.sectionGap,
      },
      bulletText: {
        fontSize: density.fontSizeBase,
        color: '#334155',
        lineHeight: density.lineSpacing,
      },
      jobTitleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '1px',
      },
      jobTitle: {
        fontSize: density.fontSizeBase,
        fontWeight: 700,
        color: color.primary,
        lineHeight: '1.3',
      },
      jobDates: {
        fontSize: density.fontSizeSub,
        color: '#64748b',
        fontStyle: 'italic',
        whiteSpace: 'nowrap',
        marginLeft: '8px',
        flexShrink: 0,
      },
      jobCompany: {
        fontSize: density.fontSizeSub,
        color: '#475569',
        marginBottom: density.bulletGap,
        fontWeight: isModern ? 500 : 400,
      },
      bulletRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '5px',
        marginBottom: density.bulletGap,
        fontSize: density.fontSizeBase,
        color: '#334155',
        lineHeight: density.lineSpacing,
      },
      bulletDot: {
        color: color.accent,
        flexShrink: 0,
        marginTop: '0.5px',
        fontWeight: 700,
      },
      skillPill: {
        fontSize: density.fontSizeBase,
        padding: isModern ? '2px 8px' : '1px 6px',
        borderRadius: isModern ? '12px' : '3px',
        background: isModern ? color.pillBg : isDense ? 'rgba(0,0,0,0.04)' : 'transparent',
        color: isModern ? color.pillText : '#334155',
        border: isModern
          ? `1px solid ${color.pillBorder}`
          : isDense
          ? '1px solid #e2e8f0'
          : 'none',
        display: 'inline-block',
        marginRight: '4px',
        marginBottom: '4px',
        fontWeight: isModern ? 500 : 400,
      },
      projectTitle: {
        fontSize: density.fontSizeBase,
        fontWeight: 700,
        color: color.primary,
      },
      projectMeta: {
        fontSize: density.fontSizeSub,
        color: '#64748b',
        fontStyle: 'italic',
      },
      eduDegree: {
        fontSize: density.fontSizeBase,
        fontWeight: 700,
        color: color.primary,
      },
      eduSchool: {
        fontSize: density.fontSizeSub,
        color: '#475569',
      },
    },
  };
}
