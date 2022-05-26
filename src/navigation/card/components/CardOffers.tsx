import React from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import styled, {useTheme} from 'styled-components/native';
import {CardContainer} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import {SlateDark} from '../../../styles/colors';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../utils/braze';
import {BoxShadow} from '../../tabs/home/components/Styled';

interface CardOffersProps {
  contentCard: ContentCard;
}

const ICON_SIZE = 50;

const CardOffersContainer = styled(CardContainer)`
  flex-direction: row;
  min-height: 78px;
  padding-left: 16px;
  padding-right: 16px;
  width: 100%;
`;

const MainColumn = styled.View`
  flex: 1 1 auto;
  padding: 14px 0;
`;

const IconColumn = styled.View`
  flex: 0 0 auto;
  justify-content: center;
  margin-left: 16px;
  padding: 14px 0;
`;

const TitleRow = styled(BaseText)`
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
`;

const DescriptionRow = styled(BaseText)`
  color: ${SlateDark};
  font-size: 12px;
`;

const IconImage = styled(FastImage)`
  height: ${ICON_SIZE}px;
  width: ${ICON_SIZE}px;
`;

const CardOffers: React.VFC<CardOffersProps> = props => {
  const theme = useTheme();
  const {contentCard} = props;
  let title = 'Card Offers';
  let description = 'Earn cash back when you shop at top retailers.';
  let iconSource: Source | null = null;

  if (
    isCaptionedContentCard(contentCard) ||
    isClassicContentCard(contentCard)
  ) {
    title = contentCard.title;
    description = contentCard.cardDescription;
  }

  if (typeof contentCard.image === 'string') {
    iconSource = {uri: contentCard.image};
  } else {
    iconSource = contentCard.image as any;
  }

  return (
    <CardOffersContainer
      style={{
        ...(theme.dark ? {} : BoxShadow),
      }}>
      <MainColumn>
        <TitleRow>{title}</TitleRow>

        <DescriptionRow>{description}</DescriptionRow>
      </MainColumn>

      {iconSource ? (
        <IconColumn>
          <IconImage source={iconSource} />
        </IconColumn>
      ) : null}
    </CardOffersContainer>
  );
};

export default CardOffers;
