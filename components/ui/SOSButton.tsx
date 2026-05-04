import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, shadow, typography } from "@/theme";

interface SOSButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: number;
}

export const SOSButton: React.FC<SOSButtonProps> = ({
  onPress,
  loading,
  disabled,
  size = 220,
}) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    if (!disabled) loop.start();
    return () => loop.stop();
  }, [pulse, disabled]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* pulsing ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.btn,
          shadow.lg,
          {
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: (size * 0.82) / 2,
          },
          pressed && styles.pressed,
          (disabled || loading) && { opacity: 0.7 },
        ]}
      >
        <Text style={[typography.display, styles.label]}>SOS</Text>
        <Text style={styles.sub}>
          {loading ? "Mengirim..." : "Tekan untuk darurat"}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    backgroundColor: colors.primary,
  },
  btn: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.94 }] },
  label: {
    color: colors.textInverse,
    fontSize: 56,
    letterSpacing: 2,
  },
  sub: {
    color: colors.textInverse,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
