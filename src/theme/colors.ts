// Tarsi Refined Surface & Typographic Tokens (Module 2269)
export const Colors = {
  light: {
    background: "#F8FAF9",
    surface0: "#F8FAF9",
    surface1: "#FFFFFF",
    surface2: "#F0F4F2",
    card: "#FFFFFF",
    cardBorder: "#E2E8E5",
    primary: "#508A59",
    primarySoft: "#508A591A",
    accent: "#508A59",
    accentSoft: "#508A591A",
    text: "#111827",
    textSecondary: "#4B5563",
    textMuted: "#9CA3AF",
    success: "#508A59",
    successSoft: "#508A591A",
    danger: "#EF4444",
    dangerSoft: "#FEE2E2",
    warning: "#F59E0B",
    warningSoft: "#FEF3C7",
    tabBar: "#FFFFFF",
    tabInactive: "#6B7280",
    divider: "#E5E7EB",
    shadow: "#000000"
  },
  dark: {
    background: "#0B0F0E", // Surface 0: Deep OLED canvas
    surface0: "#0B0F0E",
    surface1: "#151C1A",   // Surface 1: Cards & containers (improved contrast)
    surface2: "#1D2724",   // Surface 2: Elevated modals & chips
    card: "#151C1A",
    cardBorder: "#24322E",
    cardBorderFocus: "#508A59",
    primary: "#508A59",
    primarySoft: "#508A5930",
    accent: "#508A59",
    accentSoft: "#508A5930",
    text: "#F9FAFB",
    textSecondary: "#9EADA8",
    textMuted: "#5C6E67",
    success: "#508A59",
    successSoft: "#508A5925",
    danger: "#F87171",
    dangerSoft: "#451A1A",
    warning: "#FBBF24",
    warningSoft: "#451A03",
    tabBar: "#151C1A",
    tabInactive: "#768782",
    divider: "#1F2B27",
    shadow: "#000000"
  }
};

export const theme = Colors.dark;

export const typography = {
  metricHero: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  title1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
  },
  title2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};

