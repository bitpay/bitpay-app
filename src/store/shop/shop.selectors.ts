import {createSelector} from 'reselect';
import {AppSelector} from '..';
import {getGiftCardConfigList} from '../../lib/gift-cards/gift-card';
import {
  CardConfigMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
} from './shop.models';

export const selectAvailableCardMap: AppSelector<CardConfigMap> = ({SHOP}) => {
  return SHOP.availableCardMap;
};

export const selectAvailableGiftCards = createSelector(
  [selectAvailableCardMap],
  availableCardMap =>
    getGiftCardConfigList(availableCardMap).filter(config => !config.hidden),
);

export const selectCategoriesAndCurations: AppSelector<
  CategoriesAndCurations
> = ({SHOP}) => {
  return SHOP.categoriesAndCurations;
};

export const selectCategories = createSelector(
  [selectCategoriesAndCurations],
  categoriesAndCurations => {
    return Object.values(categoriesAndCurations.categories);
  },
);

export const selectIntegrationsMap: AppSelector<DirectIntegrationMap> = ({
  SHOP,
}) => {
  return SHOP.integrations as DirectIntegrationMap;
};

export const selectIntegrations = createSelector(
  [selectIntegrationsMap],
  integrationsMap => {
    return Object.values(integrationsMap);
  },
);

export const selectCategoriesWithIntegrations = createSelector(
  [selectCategories, selectIntegrations],
  (categories, integrations) => {
    return categories
      .map(category => ({
        ...category,
        integrations: integrations.filter(integration =>
          category.tags?.some((tag: string) => integration.tags.includes(tag)),
        ),
      }))
      .filter(category => category.integrations.length);
  },
);
