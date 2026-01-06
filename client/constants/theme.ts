import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#2C3E50",
    textSecondary: "#7F8C8D",
    buttonText: "#2C3E50",
    tabIconDefault: "#7F8C8D",
    tabIconSelected: "#FFD700",
    link: "#4A90E2",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F5F5F5",
    backgroundSecondary: "#EBEBEB",
    backgroundTertiary: "#E0E0E0",
    primary: "#FFD700",
    primaryDark: "#E6C200",
    secondary: "#4A90E2",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    border: "#E0E0E0",
    cardBackground: "#FFFFFF",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    buttonText: "#2C3E50",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#FFD700",
    link: "#5BA3F5",
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#242424",
    backgroundSecondary: "#2E2E2E",
    backgroundTertiary: "#383838",
    primary: "#FFD700",
    primaryDark: "#E6C200",
    secondary: "#5BA3F5",
    success: "#66BB6A",
    warning: "#FFA726",
    error: "#EF5350",
    border: "#383838",
    cardBackground: "#242424",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  "2xl": 32,
  inputHeight: 52,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: "600" as const,
  },
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 18,
    fontWeight: "500" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  button: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  small: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

const shadowStyles = {
  small: {
    web: { boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" },
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
  },
  medium: {
    web: { boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.12)" },
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
  },
  fab: {
    web: { boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.2)" },
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

export const Shadows = {
  get small() {
    return Platform.OS === "web" ? shadowStyles.small.web : shadowStyles.small.native;
  },
  get medium() {
    return Platform.OS === "web" ? shadowStyles.medium.web : shadowStyles.medium.native;
  },
  get fab() {
    return Platform.OS === "web" ? shadowStyles.fab.web : shadowStyles.fab.native;
  },
};
