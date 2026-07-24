import React, {useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native-gesture-handler';
import {useTheme} from '../../../../contexts';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {BaseText, H4, TextAlign} from '../../../../components/styled/Text';
import {
  SheetContainer,
  SheetParams,
} from '../../../../components/styled/Containers';
import {Action, LightBlack, LinkBlue, White} from '../../../../styles/colors';
import {horizontalPadding} from './styled/ShopTabComponents';
import {sleep} from '../../../../utils/helper-methods';
import {
  BottomNotificationCta,
  BottomNotificationHr,
} from '../../../../components/modal/bottom-notification/BottomNotification';

const styles = StyleSheet.create({
  sheetTitleContainer: {
    marginBottom: 25,
  },
  ctaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillSheetContainer: {
    padding: horizontalPadding,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 50,
    marginRight: 10,
    marginBottom: 12,
  },
  pillText: {
    fontWeight: '500',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});

const SheetTitleContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.sheetTitleContainer, style]} {...rest} />
);

const CtaContainer = ({
  platform,
  style,
  ...rest
}: {platform: string} & React.ComponentProps<typeof View>) => (
  <View
    style={[
      styles.ctaContainer,
      platform === 'ios' ? {marginBottom: 10} : null,
      style,
    ]}
    {...rest}
  />
);

const PillSheetContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SheetContainer>) => (
  <SheetContainer style={[styles.pillSheetContainer, style]} {...rest} />
);

const Pills = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.pills, style]} {...rest} />
);

interface PillParams {
  selected?: boolean;
}

const Pill = ({
  selected,
  style,
  ...rest
}: PillParams & React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.pill,
        {borderColor: theme.dark ? LinkBlue : Action},
        selected ? {backgroundColor: theme.dark ? LinkBlue : Action} : null,
        style,
      ]}
      {...rest}
    />
  );
};

const PillText = ({
  selected,
  style,
  ...rest
}: PillParams & React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.pillText,
        {
          color: selected
            ? theme.dark
              ? LightBlack
              : White
            : theme.dark
            ? White
            : Action,
        },
        style,
      ]}
      {...rest}
    />
  );
};

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
      modalLibrary={'bottom-sheet'}
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
