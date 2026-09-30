import {locationReducer, type LocationState} from './location.reducer';
import {LocationActionTypes} from './location.types';

const locationData = {
  countryShortCode: 'US',
  isEuCountry: false,
  stateShortCode: 'NY',
  cityFullName: 'New York',
  locationFullName: 'New York, NY, US',
};

describe('locationReducer', () => {
  it('stores a changed location', () => {
    const state = locationReducer(undefined, {
      type: LocationActionTypes.SUCCESS_GET_LOCATION,
      payload: {locationData},
    });

    expect(state.locationData).toEqual(locationData);
  });

  it('preserves the state reference for the same location', () => {
    const base: LocationState = {locationData};
    const state = locationReducer(base, {
      type: LocationActionTypes.SUCCESS_GET_LOCATION,
      payload: {locationData: {...locationData}},
    });

    expect(state).toBe(base);
  });

  it('creates a new state when one location field changes', () => {
    const base: LocationState = {locationData};
    const state = locationReducer(base, {
      type: LocationActionTypes.SUCCESS_GET_LOCATION,
      payload: {
        locationData: {...locationData, stateShortCode: 'CA'},
      },
    });

    expect(state).not.toBe(base);
    expect(state.locationData?.stateShortCode).toBe('CA');
  });
});
