import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
import TabButton from './TabButton';
import {useAppSelector} from '../../utils/hooks/useAppSelector';

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

const Tabs: React.FC<TabsProps> = props => {
  const {tabs} = props;
  const [activeTabIdx, setActiveIdx] = useState(0);
  const defaultLanguage = useAppSelector(({APP}) => APP.defaultLanguage);

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

  return (
    <View>
      <TabsHeader>{TabButtons}</TabsHeader>

      <View>{memoizedTabs[activeTabIdx].content}</View>
    </View>
  );
};

export default Tabs;
