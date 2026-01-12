import React, {useMemo} from 'react';
import {
  Canvas,
  Path as SkiaPath,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import {useTheme} from 'styled-components/native';

type LoaderSvgProps = {
  size?: number;
};

const loaderPathDefinition =
  'M28.9794 16C30.6476 16 32.0288 17.3641 31.7157 19.0027C31.3156 21.0966 30.4991 23.0998 29.3035 24.8891C27.5454 27.5203 25.0466 29.5711 22.1229 30.7821C19.1993 31.9931 15.9823 32.3099 12.8786 31.6926C9.77486 31.0752 6.92393 29.5513 4.68629 27.3137C2.44865 25.0761 0.924799 22.2251 0.307435 19.1214C-0.309928 16.0177 0.00692538 12.8007 1.21793 9.87706C2.42893 6.95345 4.47969 4.45459 7.11088 2.69649C8.90024 1.50087 10.9034 0.684358 12.9973 0.284275C14.6359 -0.0288074 16 1.35235 16 3.02056C16 4.68877 14.6176 5.99745 13.0255 6.49571C12.1235 6.77799 11.2615 7.18873 10.4671 7.7195C8.82942 8.81379 7.55296 10.3692 6.7992 12.1889C6.04544 14.0086 5.84822 16.011 6.23248 17.9429C6.61675 19.8747 7.56524 21.6492 8.95801 23.042C10.3508 24.4348 12.1253 25.3833 14.0571 25.7675C15.989 26.1518 17.9914 25.9546 19.8111 25.2008C21.6308 24.447 23.1862 23.1706 24.2805 21.5329C24.8113 20.7385 25.222 19.8765 25.5043 18.9745C26.0025 17.3824 27.3112 16 28.9794 16Z';

const variants = {
  dark: {
    colors: [
      'rgba(73, 137, 255, 0)',
      'rgba(73, 137, 255, 0.25)',
      'rgba(94, 172, 255, 0.8)',
      'rgba(131, 195, 255, 0.95)',
      'rgba(73, 137, 255, 1)',
    ],
    positions: [0, 0.3, 0.55, 0.85, 1],
  },
  light: {
    colors: [
      'rgba(34, 64, 196, 0)',
      'rgba(34, 64, 196, 0.3)',
      'rgba(66, 93, 220, 0.85)',
      'rgba(101, 126, 236, 0.97)',
      'rgba(34, 64, 196, 1)',
    ],
    positions: [0, 0.35, 0.58, 0.86, 1],
  },
} as const;

const LoaderSvg: React.FC<LoaderSvgProps> = ({size = 32}) => {
  const theme = useTheme();
  const variant = theme.dark ? variants.dark : variants.light;
  const center = size / 2;

  const gradientColors = useMemo(() => [...variant.colors], [variant.colors]);
  const gradientPositions = useMemo(
    () => [...variant.positions],
    [variant.positions],
  );

  const skiaPath = useMemo(() => {
    const basePath = Skia.Path.MakeFromSVGString(loaderPathDefinition);
    if (!basePath) {
      return undefined;
    }
    const scale = size / 32;
    const matrix = Skia.Matrix();
    matrix.scale(scale, scale);
    basePath.transform(matrix);
    return basePath;
  }, [size]);

  if (!skiaPath) {
    return null;
  }

  return (
    <Canvas style={{width: size, height: size}}>
      <SkiaPath path={skiaPath} style="fill">
        <SweepGradient
          c={vec(center, center)}
          colors={gradientColors}
          positions={gradientPositions}
          start={0}
          end={360}
        />
      </SkiaPath>
    </Canvas>
  );
};

export default LoaderSvg;
