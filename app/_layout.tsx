import "react-native-get-random-values";
import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { initDatabase, __devVerifyDatabase } from "@/lib/database";

// Suppress unhandled SplashScreen promise rejections in Expo Go
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : String(args[0] ?? '');
  if (msg.includes('native splash screen')) return;
  originalConsoleError(...args);
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase().then(async () => {
      setDbReady(true);
      if (__DEV__) {
        await __devVerifyDatabase();
      }
    });
  }, []);

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="camera"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen name="review" options={{ title: "Review Photos" }} />
        <Stack.Screen name="export" options={{ title: "Export Receipts" }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
