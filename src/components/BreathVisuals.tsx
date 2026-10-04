import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================
// BREATH BUBBLE — custom SVG replacing the platform emoji used
// for Pause & Breathe. One large luminous orb + three smaller
// orbs (matching the reference: a big bubble with three
// companion bubbles), used both as the small Home-page preview
// and as the main breathing orb during a session. The
// expand/contract animation from the original CSS
// (`transition:all {duration}s ease-in-out` on width/height/
// box-shadow driven by orbState) is preserved via an Animated.Value
// scale interpolation.
// ============================================================

interface BreathBubbleProps {
  /** 0 = smallest (rest), 1 = largest (peak inhale/hold) */
  scale: Animated.Value;
  size?: number;
  active?: boolean;
}

export const BreathBubble: React.FC<BreathBubbleProps> = ({ scale, size = 250, active = true }) => {
  const glowOpacity = scale.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.55] });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: active ? 0.16 : 0,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: (size * 0.8) / 2,
            opacity: active ? 0.1 : 0,
          },
        ]}
      />
      <Animated.View
        style={{
          transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          shadowColor: "#CFA7FF",
          shadowOpacity: 1,
          shadowRadius: Animated.multiply(glowOpacity, 90) as unknown as number,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <Svg width={size * 0.72} height={size * 0.72} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="orbGrad" cx="40%" cy="35%" r="65%">
              <Stop offset="0%" stopColor="#F5EEFF" />
              <Stop offset="30%" stopColor="#E2C8FF" />
              <Stop offset="60%" stopColor="#C49AE8" />
              <Stop offset="100%" stopColor="#8A5CBF" />
            </RadialGradient>
            <RadialGradient id="orbShine" cx="38%" cy="32%" r="40%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={100} r={95} fill="url(#orbGrad)" />
          <Ellipse cx={78} cy={72} rx={44} ry={34} fill="url(#orbShine)" />
        </Svg>
      </Animated.View>
    </View>
  );
};

// ============================================================
// MINI PREVIEW — big bubble + 3 small companion bubbles, used on
// the Home page "Pause & Breathe" dashboard card in place of the
// original pulsing emoji-less mini-orb, matching the reference
// image (large drop + three smaller translucent orbs).
// ============================================================
export const BreathMiniPreview: React.FC<{ pulse: boolean }> = ({ pulse }) => {
  const anim = useRef(new Animated.Value(pulse ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pulse ? 1 : 0,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [pulse]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });

  return (
    <View style={styles.miniWrap}>
      <Animated.View style={[styles.miniBigBubble, { transform: [{ scale }] }]}>
        <Svg width={40} height={40} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="miniGrad" cx="40%" cy="35%" r="65%">
              <Stop offset="0%" stopColor="#F0E4FF" />
              <Stop offset="50%" stopColor="#CFA7FF" />
              <Stop offset="100%" stopColor="#8A5CBF" />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={100} r={95} fill="url(#miniGrad)" />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.18)",
  },
  miniWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  miniBigBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
