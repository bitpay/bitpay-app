import React, {useState} from 'react';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {BaseText, H4, TextAlign} from '../../../../components/styled/Text';
import styled, {css} from 'styled-components/native';
import {
  SheetContainer,
  SheetParams,
} from '../../../../components/styled/Containers';
import {Platform} from 'react-native';
import {
  Action,
  Black,
  LightBlack,
  NotificationPrimary,
  White,
} from '../../../../styles/colors';
import {Theme} from '@react-navigation/native';
import {horizontalPadding} from './styled/ShopTabComponents';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {sleep} from '../../../../utils/helper-methods';

const SheetTitleContainer = styled.View`
  margin-bottom: 25px;
`;

const CtaContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  ${({platform}: {platform: string}) =>
    platform === 'ios' &&
    css`
      margin-bottom: 10px;
    `}
`;

const Cta = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0.5px;
  text-align: left;
  color: ${({primary, theme: {dark}}: {primary?: boolean; theme: Theme}) =>
    dark ? White : primary ? NotificationPrimary : Black};
  text-decoration: ${({theme: {dark}}) => (dark ? 'underline' : 'none')};
  text-decoration-color: ${White};
`;

const Hr = styled.View`
  border-bottom-color: #ebebeb;
  border-bottom-width: 1px;
  margin: 20px 0;
`;

const PillSheetContainer = styled(SheetContainer)`
  padding: ${horizontalPadding}px;
`;

const Pills = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
`;

interface PillParams {
  selected?: boolean;
}

const Pill = styled.View<PillParams>`
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 2px solid ${({theme}) => (theme.dark ? White : Action)};
  border-radius: 20px;
  padding: 0 12px;
  margin-right: 10px;
  margin-bottom: 12px;
  ${({selected, theme}) =>
    selected ? `background-color: ${theme.dark ? White : Action};` : ''};
`;

const PillText = styled(BaseText)<PillParams>`
  color: ${({selected, theme}) =>
    selected ? (theme.dark ? LightBlack : White) : theme.dark ? White : Action};
  font-weight: 500;
`;

export type CategoryMap = {[category: string]: boolean};
interface Props extends SheetParams {
  isVisible: boolean;
  closeModal: () => void;
  title?: string;
  categories: CategoryMap;
  onSelectionChange: (categories: CategoryMap) => void;
}

export const initializeCategoryMap = (categories: string[]) => {
  return categories.reduce((map, category) => {
    map[category] = false;
    return map;
  }, {} as {[category: string]: boolean});
};

const FilterSheet = ({
  isVisible,
  closeModal,
  categories,
  onSelectionChange,
}: Props) => {
  const [initialCategoryMap, setInitialCategoryMap] = useState(categories);
  const [categoryMap, setCategoryMap] = useState(categories);
  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={() => {
        setCategoryMap(initialCategoryMap);
        closeModal();
      }}>
      <PillSheetContainer>
        <SheetTitleContainer>
          <TextAlign align={'left'}>
            <H4>Filter Gift Cards</H4>
          </TextAlign>
        </SheetTitleContainer>
        <Pills>
          {Object.keys(categoryMap).map(category => (
            <TouchableWithoutFeedback
              key={category}
              onPress={() => {
                setCategoryMap({
                  ...categoryMap,
                  [category]: !categoryMap[category],
                });
              }}>
              <Pill selected={categoryMap[category]}>
                <PillText selected={categoryMap[category]}>{category}</PillText>
              </Pill>
            </TouchableWithoutFeedback>
          ))}
        </Pills>
        <Hr />
        <CtaContainer platform={Platform.OS}>
          <Cta
            suppressHighlighting={true}
            primary={true}
            onPress={async () => {
              onSelectionChange(categoryMap);
              closeModal();
              await sleep(1000);
              setInitialCategoryMap(categoryMap);
            }}>
            {'Apply Filter'.toUpperCase()}
          </Cta>
          <Cta
            suppressHighlighting={true}
            primary={false}
            onPress={() =>
              setCategoryMap(initializeCategoryMap(Object.keys(categoryMap)))
            }>
            {'Clear'.toUpperCase()}
          </Cta>
        </CtaContainer>
      </PillSheetContainer>
    </SheetModal>
  );
};

export default FilterSheet;
