import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function CameraScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="font-sans-bold text-2xl text-text">Camera Capture</Text>
      <Text className="mt-2 font-sans text-base text-text-muted">
        Coming soon
      </Text>
      <Pressable
        className="mt-8 rounded-xl bg-copper px-8 py-4 active:bg-copper-dark"
        onPress={() => router.push("/review")}
      >
        <Text className="font-sans-medium text-lg text-white">
          Done
        </Text>
      </Pressable>
    </View>
  );
}
