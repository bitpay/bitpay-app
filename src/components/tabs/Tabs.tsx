import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import TabButton from './TabButton';
import {useAppSelector} from '../../utils/hooks/useAppSelector';

interface TabsProps {
  tabs: () => {
    title: React.ReactNode;
    content: React.ReactNode;
  }[];
}

const styles = StyleSheet.create({
  tabsHeader: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingLeft: 12,
    paddingRight: 12,
  },
});

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
      <View style={styles.tabsHeader}>{TabButtons}</View>

      <View>{memoizedTabs[activeTabIdx].content}</View>
    </View>
  );
};

export default Tabs;
