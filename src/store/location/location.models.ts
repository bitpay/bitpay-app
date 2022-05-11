export interface CountryData {
  /**
   * Alpha-2 code of a country.
   */
  shortCode: string;

  /**
   * Indicates if the country belongs to the European Union
   */
  isEuCountry?: boolean;
}
