import { Colors } from "@/constants/theme";

export function useTheme() {
  return {
    theme: Colors["light"],
    isDark: false,
  };
}