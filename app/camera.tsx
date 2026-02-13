import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Animated,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { saveReceiptImage } from "@/lib/storage";

type FlashMode = "off" | "on" | "auto";
const FLASH_ICONS: Record<FlashMode, string> = {
  off: "flash-off",
  on: "flash",
  auto: "flash-outline",
};
const FLASH_ORDER: FlashMode[] = ["off", "on", "auto"];

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [capturedUris, setCapturedUris] = useState<string[]>([]);
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [lastThumb, setLastThumb] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const cameraReadyRef = useRef(false);

  const flashOpacity = useRef(new Animated.Value(0)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;

  const showFlash = useCallback(() => {
    flashOpacity.setValue(1);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [flashOpacity]);

  const animateShutter = useCallback(() => {
    Animated.sequence([
      Animated.timing(shutterScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shutterScale, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shutterScale]);

  if (permission === null) {
    return (
      <View style={[styles.fill, styles.centered, { backgroundColor: "#FAF8F5" }]}>
        <ActivityIndicator size="large" color="#C27C4E" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.centered, { backgroundColor: "#FAF8F5", paddingHorizontal: 32 }]}>
        <Ionicons name="camera" size={64} color="#C27C4E" style={{ marginBottom: 20 }} />
        <Text className="font-sans-bold text-xl text-text text-center">
          Camera access needed
        </Text>
        <Text className="font-sans text-base text-text-muted text-center mt-3">
          Burse needs your camera to scan receipts
        </Text>
        <Pressable
          className="mt-8 rounded-xl bg-copper px-8 py-4 active:bg-copper-dark"
          onPress={requestPermission}
        >
          <Text className="font-sans-medium text-lg text-white">Allow Camera</Text>
        </Pressable>
        {!permission.canAskAgain && (
          <Pressable
            className="mt-4 rounded-xl border border-border px-8 py-4"
            onPress={() => Linking.openSettings()}
          >
            <Text className="font-sans-medium text-base text-text">Open Settings</Text>
          </Pressable>
        )}
      </View>
    );
  }

  async function handleCapture() {
    if (capturing) return;
    const camera = cameraRef.current;
    if (!camera?.takePictureAsync) {
      Alert.alert("Camera not ready", "Wait a moment and try again.");
      return;
    }
    setCapturing(true);
    animateShutter();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 15000)
      );
      const result = await Promise.race([
        camera.takePictureAsync({ quality: 0.92 }),
        timeout,
      ]);
      if (result?.uri) {
        const savedUri = saveReceiptImage(result.uri);
        setCapturedUris((prev) => [...prev, savedUri]);
        setLastThumb(savedUri);
        showFlash();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("No photo", "Camera didn't return an image. Try again.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      Alert.alert(
        "Capture failed",
        msg === "timeout" ? "Timed out — try again." : "Something went wrong. Try again."
      );
    } finally {
      setCapturing(false);
    }
  }

  function handleDone() {
    if (capturedUris.length === 0) return;
    router.push({
      pathname: "/review",
      params: { imageUris: JSON.stringify(capturedUris) },
    });
  }

  const count = capturedUris.length;

  return (
    <View style={styles.fill}>
      <CameraView
        ref={cameraRef}
        style={styles.fill}
        facing="back"
        flash={flashMode}
        autofocus="on"
        onCameraReady={() => { cameraReadyRef.current = true; }}
      />

      {/* White flash overlay on capture */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "white", opacity: flashOpacity, zIndex: 20 }]}
      />

      {/* ── Top bar ── */}
      <View
        style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="white" />
        </Pressable>

        <View style={styles.flashPill}>
          <Pressable
            onPress={() =>
              setFlashMode((m) => FLASH_ORDER[(FLASH_ORDER.indexOf(m) + 1) % 3])
            }
            hitSlop={12}
            style={styles.flashPillInner}
          >
            <Ionicons
              name={FLASH_ICONS[flashMode] as any}
              size={18}
              color="#FFF"
            />
            <Text style={styles.flashLabel}>
              {flashMode === "off" ? "Off" : flashMode === "on" ? "On" : "Auto"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Bottom tray ── */}
      <View style={[styles.bottomTray, { paddingBottom: insets.bottom + 12 }]}>
        {/* Row: thumbnail — shutter — done */}
        <View style={styles.trayRow}>
          {/* Left: thumbnail */}
          <View style={styles.traySlot}>
            {lastThumb ? (
              <Pressable onPress={handleDone} style={styles.thumbWrap}>
                <Image source={{ uri: lastThumb }} style={styles.thumb} />
                <View style={styles.thumbBadge}>
                  <Text style={styles.thumbBadgeText}>{count}</Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name="images-outline" size={22} color="rgba(255,255,255,0.35)" />
              </View>
            )}
          </View>

          {/* Center: shutter */}
          <Pressable onPress={handleCapture} disabled={capturing} hitSlop={16}>
            <Animated.View
              style={[styles.shutterOuter, { transform: [{ scale: shutterScale }] }]}
            >
              <View style={styles.shutterInner} />
            </Animated.View>
          </Pressable>

          {/* Right: done */}
          <View style={styles.traySlot}>
            {count > 0 ? (
              <Pressable onPress={handleDone} hitSlop={12} style={styles.doneBtn}>
                <Text className="font-sans-bold text-base" style={{ color: "#C27C4E" }}>
                  Done
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#C27C4E" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const SHUTTER_SIZE = 78;
const SHUTTER_BORDER = 4;
const SHUTTER_GAP = 4;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },

  /* ── Top ── */
  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  flashPill: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  flashPillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  flashLabel: {
    color: "white",
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
  },

  /* ── Bottom tray ── */
  bottomTray: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  trayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  traySlot: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Thumbnail */
  thumbWrap: {
    alignItems: "center",
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "white",
  },
  thumbBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#C27C4E",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbBadgeText: {
    color: "white",
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
  },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Shutter — iOS Camera style: outer ring + inner fill */
  shutterOuter: {
    width: SHUTTER_SIZE,
    height: SHUTTER_SIZE,
    borderRadius: SHUTTER_SIZE / 2,
    borderWidth: SHUTTER_BORDER,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: SHUTTER_SIZE - SHUTTER_BORDER * 2 - SHUTTER_GAP * 2,
    height: SHUTTER_SIZE - SHUTTER_BORDER * 2 - SHUTTER_GAP * 2,
    borderRadius: (SHUTTER_SIZE - SHUTTER_BORDER * 2 - SHUTTER_GAP * 2) / 2,
    backgroundColor: "white",
  },

  /* Done — text style, no background, plenty of room */
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
});
