import React from 'react';
import {render, RenderOptions} from '@testing-library/react-native';
import {ThemeProvider} from 'styled-components/native';
import {BitPayLightTheme} from '../src/themes/bitpay';

const AllTheProviders = ({children}: {children: React.ReactNode}) => {
	return <ThemeProvider theme={BitPayLightTheme}>{children}</ThemeProvider>;
};

const customRender = (
	component: React.ReactElement<any>,
	options?: RenderOptions,
) => render(component, {wrapper: AllTheProviders, ...options});

// re-export everything from the `react-testing-library`
export * from '@testing-library/react-native';

// export our custom render method
export {customRender as render};

// This is a workaround for performance issues only, rather than using Jest ignore patterns
it('renders correctly', async () => {
	expect(1).toEqual(1);
});
