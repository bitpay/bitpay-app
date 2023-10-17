import React from 'react';
import {Path, Svg, G, Image} from 'react-native-svg';
import {useTheme} from 'styled-components/native';

const BanxaLogoSvg: React.FC<{
  isDark: boolean;
  iconOnly: boolean;
  width: number;
  height: number;
}> = ({isDark, iconOnly, width, height}) => {
  return (
    <Svg
      width={width}
      height={height}
      x="0px"
      y="0px"
      viewBox={iconOnly ? '0 0 32 32' : '0 0 200 32'}>
      <G>
        {iconOnly ? null : (
          <>
            <Path
              id="banxa-path-b"
              fillRule="evenodd"
              clipRule="evenodd"
              transform="translate(0,0) matrix(1, 0, 0, 1.01455, 1.960882, -1.579211)"
              fill={isDark ? '#fefffe' : '#101730'}
              d="M -0.5 0.686 C 6.833 0.686 13.068 0.625 20.401 0.625 C 25.097 3.346 27.508 7.541 23.389 13.389 C 27.415 15.365 29.007 21.734 23.5 28.309 C 15.5 28.309 7.5 28.602 -0.5 28.602 C -0.5 18.602 -0.5 10.686 -0.5 0.686 Z M 4.259 5.096 C 18.023 5.106 4.191 4.992 17.743 4.994 C 21.738 7.25 21.847 8.809 18.084 11.648 C 2.031 11.724 19.603 11.624 4.275 11.735 C 4.275 10.068 4.259 6.762 4.259 5.096 Z M 4.255 17.637 C 19.078 17.472 3.436 17.522 18.452 17.388 C 22.028 20.022 21.927 21.058 18.75 24.076 C 3.27 24.228 19.549 24.113 4.262 24.329 C 4.262 22.329 4.255 19.637 4.255 17.637 Z"
            />
            <Path
              id="banxa-path-a"
              fillRule="evenodd"
              clipRule="evenodd"
              transform="translate(2,0) matrix(0.947079, 0, 0, 0.946338, 2.418922, 0.730277)"
              fill={isDark ? '#fefffe' : '#101730'}
              d="M 46.036 0.264 C 48.033 -3.306 49.191 -3.3 51.145 0.095 C 63.928 22.307 51.36 0.479 64.003 22.426 C 67.078 27.765 66.928 27.766 63.484 27.875 C 52.358 28.23 44.008 28.181 32.878 27.903 C 29.81 27.826 31.526 26.242 32.985 23.64 C 46.202 0.084 32.751 24.008 46.036 0.264 Z M 48.716 5.464 C 51.017 9.749 48.576 4.995 59.053 23.331 C 53.845 23.359 44.722 23.502 38.674 23.388 C 41.32 18.707 46.301 9.478 48.716 5.464 Z"
            />
            <Path
              id="banxa-path-n"
              transform="translate(4,0) matrix(0.941159, 0, 0, 0.917661, -1.314357, 0.0161)"
              fill={isDark ? '#fefffe' : '#101730'}
              d="M 75.229 -0.745 C 77.896 -0.745 78.424 -0.736 81.091 -0.736 C 97.472 21.888 80.854 -0.209 97.277 21.204 C 97.352 14.329 97.147 5.463 97.137 -0.493 C 99.137 -0.493 100.34 -0.523 102.34 -0.523 C 102.106 9.545 102.267 19.33 102.236 29.5 C 99.569 29.5 98.956 29.5 96.289 29.5 C 91.131 23.197 85.317 15.049 80.142 8.685 C 80.316 15.15 80.334 23.158 80.5 29.5 C 78.167 29.5 77.653 29.475 75.32 29.475 C 75.32 19.475 75.229 9.255 75.229 -0.745 Z"
            />
            <Path
              transform="translate(6,0) matrix(0.891885, 0, 0, 0.894583, -27.737906, 0.082371)"
              id="banxa-path-x"
              fill={isDark ? '#fefffe' : '#101730'}
              d="M 143.384 -0.16 C 146.384 -0.16 147.701 -0.209 150.701 -0.209 C 159.03 10.73 153.614 3.441 159.052 10.593 C 164.081 3.994 162.744 6.372 167.555 -0.126 C 170.222 -0.126 171.452 -0.127 174.119 -0.127 C 162.835 14.933 173.915 -0.052 162.356 15.189 C 168.072 22.121 163.117 16.011 174.267 30.137 C 169.15 30.215 171.106 30.135 166.538 30.218 C 159.101 20.79 166.321 29.288 158.736 19.857 C 152.141 27.818 156.76 21.88 149.931 30.183 C 147.264 30.183 145.18 30.289 142.513 30.289 C 155.339 15.098 142.24 30.607 154.919 15.636 C 143.705 0.175 154.491 15.026 143.384 -0.16 Z"
            />
          </>
        )}
        {iconOnly ? (
          <Image
            id="banxa-icon-img"
            width="32"
            height="32"
            xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAABO5JREFUWEfFl31oVXUYxz/P75y765ZvwxxKWUiUutVMMfQPN73TafTHGipr9kL5RymU9iaFSjgwwkqi/liRZaKQ1NBeJkqEtubKMpc5bYWIgmFliKLo3NzuPU+cc+495163u7cMLxzu2bm/8zyf5/t7Xn4TbvBHBu1fawzH5t7E1TaH4nlXENHB2BocwLG9txA3zwAlCF0g9US7PuKO8osDhRg4wPHdw+nM+wBYBGrwLEgnwgbahtYwbVrXQCAGDtD67RKgFsiFNNWFs6gspGh20/8HcLRxHOgXCFM9J923fQdWZAkTZ17qL0T/FairsygsWIuyGsEKHAQWXDXkCjhPUlS27foDHG6cgvGiv82PPs1FBgQHsCILmDjzr/5A9E+BhoYhjJT3EB5HEEzStPA3MATID4E0jugaJu3bgNQ4fUH0D+Bg4wNYfIzoSM+RexmuAs8j3Ak86z0J8kJOglNBUVnrfwdoaspniPMpQrnnwk08H+BrrJzFSNcoHK0HJoZbo4rwLlrwAkVFnb1B9K6AqvBT01JE30aI+o49gAsYXczk2Fe4a35tXA68iZCTlh/nEX2IwtiewQM0No4nYuoxzt1+9N6lGN3ERV1OLNbhGT/WcDOdZjuiszKrQ3bR6TzKlNiFbBDZFXDLbsyY1xBWYmG8yH2IP7BMBVNLWjKMHmmoRGQLwvDwuXaAWUZR6dZssyI7QMN3M0A/wzDWc+5WvtEEwlpO/bOeqqpEBsD+/bkM69wIPOJVSvg5jElUUjjnVE8q9AywszmP6NUPMU41llt2yegtDmISC5gRO92jpEcbpoF8DtwaIAgJHH2V38+u6wZ9TTsJbe78fhG2bsZiaBg97RiWUVKyNWtSuds2oWAdhpdwNQvDO43jVFJc9vO173ZXoG7faHLs7dhaihVI75rbSbzjMcr7GLmH9t6ObbllWRz0DHdqCZvJ06cZn0zcoJelI7klVffjc9j6OhYRbBfAgziHJqqYP+ubvhqLV5Yt+55C9B0M0aAshYuIPEzhrN3pNjIV2HLgLiJaj6UTfOeArYqRWi6PeJGq3ptKYPhIUz5O4hMM89JywdVhD3a8mklzz6XWhgDvN0fIcd7A0hXYarzIfYgTEK+gsvS3PqNPX9DScD8q2xDy02ZHJyIrKCzdmCrLEKC2eSa2s4OIFmB7kbvyxzGyitbpb1EjfQ6WDMDju6NcznMH2BMZA0xpRRIPcs+cE97o8F6qbR1KvH0zti7EViGSAnAOgl3NcDnTa/Rjs/wql4oRqcMwLjk/3IWOd3w7q2uIxeI+wPpD1Vi6iYjmEVG8y1fhT2w9ie34XdDPCf8+TFD/b+9SxdJwXBu3g1LobUM4xFyPZ1AWUDz7B2HVodHk4kpfEkTuAWSA+NXgQgW5kVGiKYBUx0y17dTkDKeoP0kV1a3kti8VVrVMx3Z2EdFRfuSuY5IqJO/dZ6mIe4UIOqY/NcMBlpqiqYHmfrdim3JhdfNYHPtLbL2PnGTUqRzIqkRQoqk+4Tvw50W4XdkhFNE62qJLBFRY+cscbLOGiI4PcsCFcOX2oJxkTqRyIAmayonMjum/F+RFcIJKboc6iB5GnFe4t6w1LMOXm0cAIxhm/GfuSa/bd7v330CPv6evzbj3jwzBe3HbIdpxnsnz28IyHFCHub6L+3covb4+M6zdcIB/AT0tpQ6hw1A1AAAAAElFTkSuQmCC"
          />
        ) : (
          <G
            transform="translate(138,-4) scale(1.17)"
            id="banxa-icon-conteiner">
            <Image
              id="banxa-icon-img"
              xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAABO5JREFUWEfFl31oVXUYxz/P75y765ZvwxxKWUiUutVMMfQPN73TafTHGipr9kL5RymU9iaFSjgwwkqi/liRZaKQ1NBeJkqEtubKMpc5bYWIgmFliKLo3NzuPU+cc+495163u7cMLxzu2bm/8zyf5/t7Xn4TbvBHBu1fawzH5t7E1TaH4nlXENHB2BocwLG9txA3zwAlCF0g9US7PuKO8osDhRg4wPHdw+nM+wBYBGrwLEgnwgbahtYwbVrXQCAGDtD67RKgFsiFNNWFs6gspGh20/8HcLRxHOgXCFM9J923fQdWZAkTZ17qL0T/FairsygsWIuyGsEKHAQWXDXkCjhPUlS27foDHG6cgvGiv82PPs1FBgQHsCILmDjzr/5A9E+BhoYhjJT3EB5HEEzStPA3MATID4E0jugaJu3bgNQ4fUH0D+Bg4wNYfIzoSM+RexmuAs8j3Ak86z0J8kJOglNBUVnrfwdoaspniPMpQrnnwk08H+BrrJzFSNcoHK0HJoZbo4rwLlrwAkVFnb1B9K6AqvBT01JE30aI+o49gAsYXczk2Fe4a35tXA68iZCTlh/nEX2IwtiewQM0No4nYuoxzt1+9N6lGN3ERV1OLNbhGT/WcDOdZjuiszKrQ3bR6TzKlNiFbBDZFXDLbsyY1xBWYmG8yH2IP7BMBVNLWjKMHmmoRGQLwvDwuXaAWUZR6dZssyI7QMN3M0A/wzDWc+5WvtEEwlpO/bOeqqpEBsD+/bkM69wIPOJVSvg5jElUUjjnVE8q9AywszmP6NUPMU41llt2yegtDmISC5gRO92jpEcbpoF8DtwaIAgJHH2V38+u6wZ9TTsJbe78fhG2bsZiaBg97RiWUVKyNWtSuds2oWAdhpdwNQvDO43jVFJc9vO173ZXoG7faHLs7dhaihVI75rbSbzjMcr7GLmH9t6ObbllWRz0DHdqCZvJ06cZn0zcoJelI7klVffjc9j6OhYRbBfAgziHJqqYP+ubvhqLV5Yt+55C9B0M0aAshYuIPEzhrN3pNjIV2HLgLiJaj6UTfOeArYqRWi6PeJGq3ptKYPhIUz5O4hMM89JywdVhD3a8mklzz6XWhgDvN0fIcd7A0hXYarzIfYgTEK+gsvS3PqNPX9DScD8q2xDy02ZHJyIrKCzdmCrLEKC2eSa2s4OIFmB7kbvyxzGyitbpb1EjfQ6WDMDju6NcznMH2BMZA0xpRRIPcs+cE97o8F6qbR1KvH0zti7EViGSAnAOgl3NcDnTa/Rjs/wql4oRqcMwLjk/3IWOd3w7q2uIxeI+wPpD1Vi6iYjmEVG8y1fhT2w9ie34XdDPCf8+TFD/b+9SxdJwXBu3g1LobUM4xFyPZ1AWUDz7B2HVodHk4kpfEkTuAWSA+NXgQgW5kVGiKYBUx0y17dTkDKeoP0kV1a3kti8VVrVMx3Z2EdFRfuSuY5IqJO/dZ6mIe4UIOqY/NcMBlpqiqYHmfrdim3JhdfNYHPtLbL2PnGTUqRzIqkRQoqk+4Tvw50W4XdkhFNE62qJLBFRY+cscbLOGiI4PcsCFcOX2oJxkTqRyIAmayonMjum/F+RFcIJKboc6iB5GnFe4t6w1LMOXm0cAIxhm/GfuSa/bd7v330CPv6evzbj3jwzBe3HbIdpxnsnz28IyHFCHub6L+3covb4+M6zdcIB/AT0tpQ6hw1A1AAAAAElFTkSuQmCC"
            />
          </G>
        )}
      </G>
    </Svg>
  );
};

const BanxaLogo = ({
  width,
  height,
  iconOnly = false,
}: {
  width?: number;
  height?: number;
  iconOnly?: boolean;
}) => {
  const theme = useTheme();
  const widthSize = width ? width : iconOnly ? 32 : 184;
  const heightSize = height ? height : 32;

  return (
    <BanxaLogoSvg
      isDark={theme.dark}
      iconOnly={iconOnly}
      width={widthSize}
      height={heightSize}
    />
  );
};

export default BanxaLogo;
