export interface LocationData {
  /**
   * Alpha-2 code of a country. E.g. "US"
   */
  countryShortCode: string;

  /**
   * Indicates if the country belongs to the European Union
   */
  isEuCountry?: boolean;

  /**
   * Alpha-2 / Alpha-1 code of a state. E.g. "NY"
   */
  stateShortCode?: string;

  /**
   * Full name of a city. E.g. "New York"
   */
  cityFullName?: string;

  /**
   * Full location string with format: "City, State, Country". E.g. "New York, NY, US"
   */
  locationFullName?: string;
}
