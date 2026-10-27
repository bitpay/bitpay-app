import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {
  CurrencyColumn,
  CurrencyImageContainer,
  ActiveOpacity,
} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, ListItemSubText} from '../styled/Text';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {GlobalSelectObj} from '../../navigation/wallet/screens/GlobalSelect';
import {useTheme} from '../../contexts';
import {Slate, Slate30} from '../../styles/colors';
import AngleRightSvg from '../../../assets/img/angle-right.svg';
import {Img} from '../../navigation/tabs/home/components/Wallet';
import _ from 'lodash';

interface Props {
  item: GlobalSelectObj;
  hasSelectedChainFilterOption: boolean;
  emit: (item: GlobalSelectObj) => void;
}

const styles = StyleSheet.create({
  availableWalletsPill: {
    borderWidth: 1,
    flexDirection: 'row',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    marginRight: 10,
  },
  availableChainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    padding: 4,
    marginRight: 10,
  },
});

export const AvailableWalletsPill: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.availableWalletsPill,
        {borderColor: theme.dark ? Slate : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

export const AvailableChainContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.availableChainContainer, style]} {...rest} />
);

interface CurrencyBadgeListProps {
  chainsImg: {
    [key: string]: {
      badgeUri?: string | ((props?: any) => React.ReactElement) | undefined;
      badgeImg?: string | ((props?: any) => React.ReactElement) | undefined;
      priority: number | undefined;
    };
  };
}

const CurrencyBadgeList: React.FC<CurrencyBadgeListProps> = ({chainsImg}) => {
  const chainValues = _.orderBy(Object.values(chainsImg), 'priority', 'asc');
  const images = chainValues
    .map(({badgeUri, badgeImg}) => badgeUri || badgeImg)
    .filter(
      (img): img is string | ((props?: any) => React.ReactElement) => !!img,
    );

  return (
    <>
      {images.map((img, index) => {
        const marginLeft = index === 0 ? 1 : -6;
        return (
          <Img
            key={typeof img === 'string' ? `${img}-${index}` : index}
            isFirst={index === 0}
            style={{marginLeft}}>
            <CurrencyImage img={img} size={25} />
          </Img>
        );
      })}
    </>
  );
};

const GlobalSelectRow = ({item, hasSelectedChainFilterOption, emit}: Props) => {
  const {currencyName, currencyAbbreviation, img, chainsImg} = item;
  return (
    <RowContainer
      noBorder={true}
      activeOpacity={ActiveOpacity}
      onPress={() => emit(item)}>
      <CurrencyImageContainer>
        <CurrencyImage img={img} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <H5>{currencyName}</H5>
        <ListItemSubText ellipsizeMode="tail" numberOfLines={1}>
          {currencyAbbreviation.toUpperCase()}
        </ListItemSubText>
      </CurrencyColumn>
      {!hasSelectedChainFilterOption ? (
        <AvailableChainContainer>
          <CurrencyBadgeList chainsImg={chainsImg} />
        </AvailableChainContainer>
      ) : null}
      <AngleRightSvg />
    </RowContainer>
  );
};

export default memo(GlobalSelectRow);
