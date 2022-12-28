import React, {useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, View} from 'react-native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
import TabButton from './TabButton';
import {useAppSelector} from '../../utils/hooks/useAppSelector';
import QuickActions, {ShortcutItem} from 'react-native-quick-actions';
import {useAppDispatch} from '../../utils/hooks';
import {shortcutListener} from '../../store/app/app.effects';
import {useNavigation} from '@react-navigation/native';

interface TabsProps {
  tabs: () => {
    title: React.ReactNode;
    content: React.ReactNode;
  }[];
}

const TabsHeader = styled.View`
  flex-direction: row;
  flex-wrap: nowrap;
  padding-left: ${ScreenGutter};
  padding-right: ${ScreenGutter};
`;

const Tabs: React.VFC<TabsProps> = props => {
  const {tabs} = props;
  const [activeTabIdx, setActiveIdx] = useState(0);
  const defaultLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const memoizedTabs = useMemo(() => {
    const tabData = tabs();

    if (!tabData || !tabData.length) {
      return [];
    }

    return tabData.map((t, idx) => ({
      ...t,
      key: 'tab-' + idx,
    }));
  }, [tabs, defaultLanguage]);

  const TabButtons = memoizedTabs.map((d, idx) => (
    <TabButton
      bold
      key={d.key}
      active={activeTabIdx === idx}
      onPress={() => setActiveIdx(idx)}>
      {d.title}
    </TabButton>
  ));

  // QUICK LINKS
  useEffect(() => {
    QuickActions.popInitialAction()
      .then(item => dispatch(shortcutListener(item, navigation)))
      .catch(console.error);
    const subscription = DeviceEventEmitter.addListener(
      'quickActionShortcut',
      (item: ShortcutItem) => {
        dispatch(shortcutListener(item, navigation));
      },
    );
    return () => subscription.remove();
  }, []);

  return (
    <View>
      <TabsHeader>{TabButtons}</TabsHeader>

      <View>{memoizedTabs[activeTabIdx].content}</View>
    </View>
  );
};

export default Tabs;
