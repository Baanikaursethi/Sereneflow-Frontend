import React from "react";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

/** Shared Pause & Breathe three-bubble icon. */
export const BreathIcon: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Defs>
      <RadialGradient id="breathIconBig" cx="35%" cy="30%" r="70%">
        <Stop offset="0%" stopColor="#F4E8FF" />
        <Stop offset="35%" stopColor="#D9B9FF" />
        <Stop offset="72%" stopColor="#B27DE6" />
        <Stop offset="100%" stopColor="#8153B8" />
      </RadialGradient>
      <RadialGradient id="breathIconSmall" cx="35%" cy="30%" r="70%">
        <Stop offset="0%" stopColor="#E7D3FF" stopOpacity="0.42" />
        <Stop offset="100%" stopColor="#B98CE8" stopOpacity="0.18" />
      </RadialGradient>
    </Defs>
    {/* The three bubbles from the Pause & Breathe reference: one large,
        one lower-right, and one small upper-right. */}
    <Circle cx="24" cy="36" r="13" fill="url(#breathIconBig)" />
    <Circle cx="43" cy="43" r="9" fill="url(#breathIconSmall)" />
    <Circle cx="43" cy="20" r="6" fill="url(#breathIconSmall)" />
  </Svg>
);
