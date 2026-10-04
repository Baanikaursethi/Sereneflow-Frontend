import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";
import { SFLogo } from "../components/SFLogo";
import { COLORS } from "../lib/theme";

export const Splash: React.FC = () => {
  const barWidth = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.timing(barWidth, {
      toValue: 100,
      duration: 2000,
      delay: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={styles.splash}>
      <Animated.View style={[styles.center, { opacity: fade }]}>
        <SFLogo size={100} glow showWordmark />
        <View style={styles.barWrap}>
          <Animated.View
            style={[styles.bar, { width: barWidth.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { alignItems: "center", gap: 28 },
  barWrap: {
    width: 110,
    height: 1.5,
    backgroundColor: "rgba(207,167,255,0.11)",
    borderRadius: 2,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: "#CFA7FF",
    borderRadius: 2,
  },
});
