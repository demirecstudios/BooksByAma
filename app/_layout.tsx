import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Platform, StyleSheet, View } from "react-native";
import { supabase } from "../supabase";
import { AppProvider } from "./context/AppContext";
import { CartProvider } from "./context/CartContext";
import { darkColors, spacing } from "./theme";

SplashScreen.preventAutoHideAsync();

const PUBLIC_ROUTES = ["index", "register"];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(userId: string) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: darkColors.accent,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: "7ea1b439-ad7c-4f4c-9851-1be890b047d3",
  });

  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      { user_id: userId, token: token.data },
      { onConflict: "user_id,token" },
    );

  if (error) {
    console.log("Error saving push token:", error.message);
  }

  return token.data;
}

async function getUserRole(session: any): Promise<"admin" | "author" | "user"> {
  const user = session?.user;
  if (!user) return "user";

  const meta = user.user_metadata ?? {};
  const email = user.email || "";

  if (meta.is_admin === true || email === "demirecstudios@gmail.com") {
    return "admin";
  }

  const { data } = await supabase
    .from("authors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (data) return "author";

  return "user";
}

function SplashScreenView() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <View style={splash.container}>
      <Animated.View style={[splash.logoWrap, { opacity }]}>
        <Image
          source={require("../assets/logo.png")}
          style={splash.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 180,
    height: 120,
  },
});

export default function RootLayout() {
  const [session, setSession] = useState<any>(undefined);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<"admin" | "author" | "user" | null>(null);
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) {
      console.warn("Font loading failed:", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session ?? null);
      if (session) {
        const userRole = await getUserRole(session);
        setRole(userRole);
      } else {
        setRole(null);
      }
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session ?? null);
      if (session) {
        const userRole = await getUserRole(session);
        setRole(userRole);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (role === null && session !== null) return;

    const currentRoute = segments[0] as string | undefined;
    const inPublicRoute = !currentRoute || PUBLIC_ROUTES.includes(currentRoute);

    if (!session) {
      if (!inPublicRoute || !currentRoute) {
        router.replace("/");
      }
    } else if (inPublicRoute) {
      if (role === "admin") {
        router.replace("/bookstore");
      } else if (role === "author") {
        router.replace("/author");
      } else {
        router.replace("/bookstore");
      }
    }
  }, [ready, session, role, segments, router]);

  useEffect(() => {
    if (session) {
      registerForPushNotifications(session.user.id);
    }
  }, [session]);

  useEffect(() => {
    if (ready && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [ready, fontsLoaded, fontError]);

  const appReady = ready && (fontsLoaded || !!fontError);

  if (!appReady) {
    return <SplashScreenView />;
  }

  return (
    <AppProvider fontsLoaded={fontsLoaded && !fontError}>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </CartProvider>
    </AppProvider>
  );
}
