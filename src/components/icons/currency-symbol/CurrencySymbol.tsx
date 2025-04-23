import React from 'react';
import {useTheme} from 'styled-components/native';
import {Path, Svg, G} from 'react-native-svg';
import {NotificationPrimary, White} from '../../../styles/colors';
import useAppSelector from '../../../utils/hooks/useAppSelector';
import {HEIGHT} from '../../styled/Containers';

interface CurrencySymbolProps {
  isDark: boolean;
  isSmallScreen?: boolean;
}

const CurrencySymbolSvg: React.FC<CurrencySymbolProps> = ({
  isDark,
  isSmallScreen,
}) => {
  const width = isSmallScreen ? 12 : 20;
  const height = isSmallScreen ? 12 : 20;
  return (
    <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
      <G opacity="0.5">
        <Path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M10 0C4.48583 0 0 4.48583 0 10C0 15.5142 4.48583 20 10 20C15.5142 20 20 15.5142 20 10C20 4.48583 15.5142 0 10 0ZM13.4433 11.9592C13.4433 13.25 12.8133 13.9633 12.2842 14.335C11.87 14.6258 11.3708 14.7992 10.8333 14.8992V16.6667H9.16667V14.9692C8.20751 14.8967 7.22917 14.6683 6.38334 14.3633L5.6 14.0808L6.16584 12.5133L6.95 12.7967C7.71667 13.0733 8.47834 13.2383 9.16667 13.3017V10.3775C7.8425 9.9025 6.37334 9.16083 6.37334 7.27583C6.37334 6.33583 6.80917 5.56 7.60167 5.09167C8.05334 4.825 8.59667 4.68083 9.16667 4.61333V3.33333H10.8333V4.62583C11.8142 4.74 12.7125 5.00917 13.2133 5.28583L13.9442 5.68667L13.1417 7.1475L12.4117 6.74583C12.0508 6.5475 11.4617 6.38583 10.8333 6.29833V9.185C12.1067 9.635 13.4433 10.2867 13.4433 11.9592ZM8.45083 6.52749C8.16333 6.69749 8.03999 6.92083 8.03999 7.27583C8.03999 7.90666 8.39749 8.25083 9.16666 8.58499V6.29666C8.89333 6.34416 8.64166 6.41416 8.45083 6.52749ZM11.7767 11.9583C11.7767 12.5825 11.52 12.8342 11.3267 12.97C11.1933 13.0642 11.0208 13.1325 10.8333 13.19V10.9742C11.4758 11.2492 11.7767 11.515 11.7767 11.9583Z"
          fill={isDark ? White : NotificationPrimary}
        />
      </G>
    </Svg>
  );
};
const CurrencySymbol = () => {
  const theme = useTheme();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const _isSmallScreen = showArchaxBanner ? true : HEIGHT < 700;

  return (
    <CurrencySymbolSvg isDark={theme.dark} isSmallScreen={_isSmallScreen} />
  );
};

export default CurrencySymbol;
