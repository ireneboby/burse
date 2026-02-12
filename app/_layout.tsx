import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { initDatabase, __devVerifyDatabase } from "@/lib/database";

SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (fontsLoaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady]);

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
