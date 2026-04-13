import React from 'react';
import {Text} from 'react-native';
import {Provider} from 'react-redux';
import {render, fireEvent} from '@test/render';
import {ThemeProvider} from 'styled-components/native';
import {BitPayLightTheme} from '../../themes/bitpay';
import Tabs from './Tabs';
import configureTestStore from '@test/store';

const renderWithStore = (ui: React.ReactElement, initialState = {}) => {
  const store = configureTestStore(initialState);
  return render(
    <Provider store={store}>{ui}</Provider>,
  );
};

const makeTabs = () => [
  {title: <Text>Tab One</Text>, content: <Text>Content One</Text>},
  {title: <Text>Tab Two</Text>, content: <Text>Content Two</Text>},
  {title: <Text>Tab Three</Text>, content: <Text>Content Three</Text>},
];

describe('Tabs', () => {
  it('renders all tab titles', () => {
    const {getByText} = renderWithStore(<Tabs tabs={makeTabs} />);
    expect(getByText('Tab One')).toBeTruthy();
    expect(getByText('Tab Two')).toBeTruthy();
    expect(getByText('Tab Three')).toBeTruthy();
  });

  it('renders the first tab content by default', () => {
    const {getByText} = renderWithStore(<Tabs tabs={makeTabs} />);
    expect(getByText('Content One')).toBeTruthy();
  });

  it('switches to second tab content when second tab is pressed', () => {
    const {getByText, queryByText} = renderWithStore(
      <Tabs tabs={makeTabs} />,
    );
    fireEvent.press(getByText('Tab Two'));
    expect(getByText('Content Two')).toBeTruthy();
    // First tab content should no longer be shown
    expect(queryByText('Content One')).toBeNull();
  });

  it('switches between tabs correctly', () => {
    const {getByText} = renderWithStore(<Tabs tabs={makeTabs} />);
    // Switch to third tab
    fireEvent.press(getByText('Tab Three'));
    expect(getByText('Content Three')).toBeTruthy();
    // Switch back to first tab
    fireEvent.press(getByText('Tab One'));
    expect(getByText('Content One')).toBeTruthy();
  });

  it('renders with a single tab', () => {
    const singleTab = () => [
      {title: <Text>Only Tab</Text>, content: <Text>Only Content</Text>},
    ];
    const {getByText} = renderWithStore(<Tabs tabs={singleTab} />);
    expect(getByText('Only Tab')).toBeTruthy();
    expect(getByText('Only Content')).toBeTruthy();
  });
});
