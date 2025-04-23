import React from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArchaxBannerText, ArchaxBannerLink} from '../styled/Text';
import {openUrlWithInAppBrowser} from '../../store/app/app.effects';
import {useAppDispatch} from '../../utils/hooks';
import {ArchaxBannerContainer} from '../../components/styled/Containers';

interface ArchaxBannerProps {
  isSmallScreen?: boolean;
}

const ArchaxBanner: React.FC<ArchaxBannerProps> = ({isSmallScreen}) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  return (
    <ArchaxBannerContainer inset={insets} isSmallScreen={isSmallScreen}>
      <ArchaxBannerText isSmallScreen={isSmallScreen}>
        Don't invest unless you're prepared to lose all the money you invest.
        This is a high-risk investment and you should not expect to be protected
        if something goes wrong.{' '}
        <ArchaxBannerLink
          isSmallScreen={isSmallScreen}
          onPress={() => {
            dispatch(
              openUrlWithInAppBrowser(
                'https://www.bitpay.com/en-gb/about/risk-summary',
              ),
            );
          }}>
          Take 2 mins to learn more.
        </ArchaxBannerLink>
      </ArchaxBannerText>
    </ArchaxBannerContainer>
  );
};

export default ArchaxBanner;
