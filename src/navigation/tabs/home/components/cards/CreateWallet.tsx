import React from 'react';
import {Theme, useNavigation} from '@react-navigation/native';
import LinkCard from './LinkCard';
import {Path, Svg} from 'react-native-svg';
import {White} from '../../../../../styles/colors';
import {useTranslation} from 'react-i18next';
import {useAppDispatch} from '../../../../../utils/hooks';
import {Analytics} from '../../../../../store/analytics/analytics.effects';

const image = (theme: Theme) => {
  return (
    <Svg width="15" height="13" viewBox="0 0 15 13" fill="none">
      <Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M12.5 2.03804H14.375C14.72 2.03804 15 2.2663 15 2.54755V11.1671C15 11.6163 14.375 12.2283 13.8657 12.2283H2.5C1.11937 12.2283 0 11.3157 0 10.1902V1.52853C0 0.684273 0.839375 0 1.875 0H11.875C12.22 0 12.5 0.228261 12.5 0.509511V2.03804ZM2.5 2.03804H11.25V1.01902H1.875C1.53062 1.01902 1.25 1.24779 1.25 1.52853C1.25 1.80927 1.53062 2.03804 1.875 2.03804H2.5ZM10 7.2258C10 7.83999 10.5594 8.33746 11.25 8.33746C11.9406 8.33746 12.5 7.83999 12.5 7.2258C12.5 6.6116 11.9406 6.11414 11.25 6.11414C10.5594 6.11414 10 6.6116 10 7.2258Z"
        fill={theme.dark ? White : '#2240C4'}
      />
    </Svg>
  );
};

const CreateWallet = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  return (
    <LinkCard
      image={image}
      description={t('Create, import or join a shared wallet')}
      onPress={() => {
        dispatch(
          Analytics.track('Clicked create, import or join', {
            context: 'ExpandPortfolioCarousel',
          }),
        );
        navigation.navigate('CreationOptions');
      }}
    />
  );
};

export default CreateWallet;
