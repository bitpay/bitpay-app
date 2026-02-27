import React, {useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import type {RootStackParamList} from '../../../../Root';
import {ScreenGutter} from '../../../../components/styled/Containers';
import Button from '../../../../components/button/Button';
import {HomeSectionTitle} from './Styled';
import AssetsList from './AssetsList';
import {GainLossMode} from '../../../../utils/portfolio/assets';
import AssetsGainLossDropdown from './AssetsGainLossDropdown';
import {useAppSelector} from '../../../../utils/hooks';
import usePortfolioAssetRows from '../hooks/usePortfolioAssetRows';

const Container = styled.View`
  margin-top: 5px;
  margin-bottom: 25px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0 ${ScreenGutter} 0 16px;
`;

const ButtonContainer = styled.View`
  margin: 0px ${ScreenGutter} 0;
`;

const AssetsSection: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [gainLossMode, setGainLossMode] = useState<GainLossMode>('1D');
  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const {visibleItems, isFiatLoading, isPopulateLoadingByKey} =
    usePortfolioAssetRows({
      gainLossMode,
    });

  const hasAnySnapshots = useMemo(() => {
    for (const v of Object.values(portfolio.snapshotsByWalletId || {})) {
      if (Array.isArray(v) && v.length > 0) {
        return true;
      }
    }
    return false;
  }, [portfolio.snapshotsByWalletId]);

  const items = useMemo(() => {
    return visibleItems.slice(0, 4);
  }, [visibleItems]);

  if (!portfolio.populateStatus?.inProgress && !hasAnySnapshots) {
    return null;
  }

  if (!items.length) {
    return null;
  }

  return (
    <Container>
      <Header>
        <HomeSectionTitle>{t('Assets')}</HomeSectionTitle>
        <AssetsGainLossDropdown
          value={gainLossMode}
          onChange={setGainLossMode}
        />
      </Header>

      <AssetsList
        items={items}
        isFiatLoading={isFiatLoading}
        populateInProgress={!!portfolio.populateStatus?.inProgress}
        isPopulateLoadingByKey={isPopulateLoadingByKey}
      />

      <ButtonContainer>
        <Button
          buttonStyle="secondary"
          height={50}
          buttonOutline
          onPress={() => navigation.navigate('AllAssets')}>
          {t('See All Assets')}
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default AssetsSection;
