import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback, // ← add this
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../../supabase";

const THEME_KEY = "@app:theme";

type UserProfile = {
  displayName: string;
  displayHandle: string;
  avatarInitial: string;
};

type AppContextType = {
  isDark: boolean;
  toggleTheme: () => void;
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
  profile: DEFAULT_PROFILE,
  reloadUser: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  // Load persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored !== null) setIsDark(stored === "dark");
    });
  }, []);

  // ← wrap in useCallback so useFocusEffect in profile.tsx gets a stable ref
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
  }, []); // stable — supabase and DEFAULT_PROFILE never change

  // Load user on mount
  useEffect(() => {
    reloadUser();
  }, [reloadUser]); // ← was []

  async function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  return (
    <AppContext.Provider value={{ isDark, toggleTheme, profile, reloadUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
