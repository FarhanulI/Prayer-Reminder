import React, { useEffect } from "react";
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const WAVE_PATH = `
M1039.839,-12.735C1005.099,-12.735,1005.099,-24.735,970.359,-24.735
C935.619,-24.735,935.619,-12.735,900.879,-12.735
C866.149,-12.735,866.149,-24.735,831.409,-24.735
C796.669,-24.735,796.669,-12.735,761.939,-12.735
C727.199,-12.735,727.199,-24.735,692.459,-24.735
C657.719,-24.735,657.719,-12.735,622.979,-12.735
L-1109.329,-12.735
L-1109.329,24.735
L1109.329,24.735
L1109.329,-24.735
Z
`;

export default function AudioLoaderSvg() {
  const wave1 = useSharedValue(-2600);
  const wave2 = useSharedValue(0);

  useEffect(() => {
    wave1.value = withRepeat(
      withTiming(350, {
        duration: 5900,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    wave2.value = withRepeat(
      withTiming(2500, {
        duration: 5900,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, []);

  const animatedProps1 = useAnimatedProps(() => ({
    transform: `translate(${wave1.value},34) scale(3.468)`,
  }));

  const animatedProps2 = useAnimatedProps(() => ({
    transform: `translate(${wave2.value},34) scale(6.025,3.468)`,
  }));

  return (
    <Svg width="100%" height="100%" viewBox="0 0 600 100">
      <AnimatedPath
        animatedProps={animatedProps1}
        d={WAVE_PATH}
        fill="#ffcd00"
        fillOpacity={0.19}
      />

      <AnimatedPath
        animatedProps={animatedProps2}
        d={WAVE_PATH}
        fill="#ffcd00"
        fillOpacity={0.26}
      />
    </Svg>
  );
}
