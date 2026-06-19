import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../supabase";
import {
  createTheme,
  getColors,
  type Theme,
  type ThemeColors,
} from "../theme";

export type { ThemeColors };

const THEME_KEY = "@app:theme";

type UserProfile = {
  displayName: string;
  displayHandle: string;
  avatarInitial: string;
};

type AppContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
  theme: Theme;
  fontsLoaded: boolean;
  setFontsLoaded: (loaded: boolean) => void;
  profile: UserProfile;
  reloadUser: () => Promise<void>;
};

const DEFAULT_PROFILE: UserProfile = {
  displayName: "Reader",
  displayHandle: "@reader",
  avatarInitial: "R",
};

const AppContext = createContext<AppContextType>({
  isDark: true,
  toggleTheme: () => {},
  colors: getColors(true),
  theme: createTheme(true, false),
  fontsLoaded: false,
  setFontsLoaded: () => {},
  profile: DEFAULT_PROFILE,
  reloadUser: async () => {},
});

export function AppProvider({
  children,
  fontsLoaded = false,
}: {
  children: ReactNode;
  fontsLoaded?: boolean;
}) {
  const [isDark, setIsDark] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [fontsReady, setFontsReady] = useState(fontsLoaded);

  useEffect(() => {
    setFontsReady(fontsLoaded);
  }, [fontsLoaded]);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored !== null) setIsDark(stored === "dark");
    });
  }, []);

  const reloadUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;

    const fullName = (user.user_metadata?.full_name as string) || "";
    const username = (user.user_metadata?.username as string) || "";
    const email = user.email || "";

    const name = fullName || email.split("@")[0] || DEFAULT_PROFILE.displayName;
    const handle = username
      ? `@${username}`
      : email
        ? `@${email.split("@")[0]}`
        : DEFAULT_PROFILE.displayHandle;

    setProfile({
      displayName: name,
      displayHandle: handle,
      avatarInitial: (name || "?").charAt(0).toUpperCase(),
    });
  }, []);

  useEffect(() => {
    reloadUser();
  }, [reloadUser]);

  async function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  const colors = useMemo(() => getColors(isDark), [isDark]);
  const theme = useMemo(
    () => createTheme(isDark, fontsReady),
    [isDark, fontsReady],
  );

  return (
    <AppContext.Provider
      value={{
        isDark,
        toggleTheme,
        colors,
        theme,
        fontsLoaded: fontsReady,
        setFontsLoaded: setFontsReady,
        profile,
        reloadUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
