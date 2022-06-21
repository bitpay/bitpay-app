import React, {useState} from 'react';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
import TabButton from './TabButton';

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
  const [activeTabIdx, setActiveIdx] = useState(0);

  if (!props.tabs() || !props.tabs().length) {
    return null;
  }

  const tabs = props.tabs().map((t, idx) => ({
    ...t,
    key: 'tab-' + idx,
  }));

  const TabButtons = tabs.map((d, idx) => (
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

      <View>{tabs[activeTabIdx].content}</View>
    </View>
  );
};

export default Tabs;
