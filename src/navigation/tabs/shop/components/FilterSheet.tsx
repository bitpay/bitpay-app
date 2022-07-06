import React, {useState} from 'react';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {BaseText, H4, TextAlign} from '../../../../components/styled/Text';
import styled, {css} from 'styled-components/native';
import {
  SheetContainer,
  SheetParams,
} from '../../../../components/styled/Containers';
import {Platform, ScrollView} from 'react-native';
import {Action, LightBlack, LinkBlue, White} from '../../../../styles/colors';
import {horizontalPadding} from './styled/ShopTabComponents';
import {sleep} from '../../../../utils/helper-methods';
import {
  BottomNotificationCta,
  BottomNotificationHr,
} from '../../../../components/modal/bottom-notification/BottomNotification';
import {useTranslation} from 'react-i18next';

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
  border: ${({theme: {dark}}) => `2px solid ${dark ? LinkBlue : Action}`};
  border-radius: 50px;
  margin-right: 10px;
  margin-bottom: 12px;
  ${({selected, theme: {dark}}) =>
    selected ? `background-color: ${dark ? LinkBlue : Action};` : ''};
`;

const PillText = styled(BaseText)<PillParams>`
  color: ${({selected, theme}) =>
    selected ? (theme.dark ? LightBlack : White) : theme.dark ? White : Action};
  font-weight: 500;
  padding: 8px 12px;
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
  const {t} = useTranslation();
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
        <ScrollView>
          <SheetTitleContainer>
            <TextAlign align={'left'}>
              <H4>{t('Filter Gift Cards')}</H4>
            </TextAlign>
          </SheetTitleContainer>
          <Pills>
            {Object.keys(categoryMap).map(category => (
              <Pill key={category} selected={categoryMap[category]}>
                <PillText
                  selected={categoryMap[category]}
                  onPress={() =>
                    setCategoryMap({
                      ...categoryMap,
                      [category]: !categoryMap[category],
                    })
                  }>
                  {category}
                </PillText>
              </Pill>
            ))}
          </Pills>
        </ScrollView>
        <BottomNotificationHr />
        <CtaContainer platform={Platform.OS}>
          <BottomNotificationCta
            suppressHighlighting={true}
            primary={true}
            onPress={async () => {
              onSelectionChange(categoryMap);
              closeModal();
              await sleep(1000);
              setInitialCategoryMap(categoryMap);
            }}>
            {t('Apply Filter').toUpperCase()}
          </BottomNotificationCta>
          <BottomNotificationCta
            suppressHighlighting={true}
            primary={false}
            onPress={() =>
              setCategoryMap(initializeCategoryMap(Object.keys(categoryMap)))
            }>
            {t('Clear').toUpperCase()}
          </BottomNotificationCta>
        </CtaContainer>
      </PillSheetContainer>
    </SheetModal>
  );
};

export default FilterSheet;
