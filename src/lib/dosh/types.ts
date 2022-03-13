export type DoshLogoStyle = 'CIRCLE' | 'RECTANGLE';
export type DoshBrandDetailsHeaderStyle = 'DIAGONAL' | 'RECTANGLE';

export interface IPoweredByUiOptions {
  /**
   * The title displayed in the Dosh UI header.
   */
  feedTitle: string;

  /**
   * {'CIRCLE'|'RECTANGLE'} How each brand's logo is displayed on the brand details page.
   */
  logoStyle: DoshLogoStyle;

  /**
   * {'DIAGONAL'|'RECTANGLE'} How each brand's header image is displayed on the brand details page. 'DIAGONAL' displays at a slant and positions the logo on the right. 'RECTANGLE' displays as a rectangle and positions the logo in the center.
   */
  brandDetailsHeaderStyle: DoshBrandDetailsHeaderStyle;

  /**
   * TODO
   */
  enterAnimationId?: number;

  /**
   * TODO
   */
  exitAnimatedId?: number;
}

/**
 * An options object used to configure the Dosh UI.
 * TODO: does this apply to iOS SDK?
 */
export class PoweredByUiOptions implements IPoweredByUiOptions {
  feedTitle: string;
  logoStyle: DoshLogoStyle;
  brandDetailsHeaderStyle: DoshBrandDetailsHeaderStyle;

  /**
   * @param feedTitle The title displayed in the Dosh UI header.
   * @param logoStyle {'CIRCLE'|'RECTANGLE'} How each brand's logo is displayed on the brand details page.
   * @param headerStyle {'DIAGONAL'|'RECTANGLE'} How each brand's header image is displayed on the brand details page. 'DIAGONAL' displays at a slant and positions the logo on the right. 'RECTANGLE' displays as a rectangle and positions the logo in the center.
   */
  constructor(
    feedTitle: string,
    logoStyle: DoshLogoStyle,
    headerStyle: DoshBrandDetailsHeaderStyle,
  ) {
    this.feedTitle = feedTitle;
    this.logoStyle = logoStyle;
    this.brandDetailsHeaderStyle = headerStyle;
  }
}

export interface IDosh {
  /**
   * This should be done before any other calls to the PoweredByDosh SDK.
   * TODO: pass in applicationId from JS?
   */
  initializeDosh: () => Promise<any>;

  /**
   * User authorization between the app and Dosh is coordinated by providing the SDK with an authorization token.
   * This token should be requested from the BitPay server.
   */
  setDoshToken: (token: string) => Promise<any>;

  /**
   * Present a full screen view that is managed by the SDK.
   */
  present: (uiOptions?: PoweredByUiOptions) => Promise<any>;

  /**
   * Any time the app's current user changes, such as when the user logs out, the user's information should be cleared.
   */
  clearUser: () => Promise<any>;

  /**
   * @deprecated For development purposes only. Do not call this in production.
   */
  presentIntegrationChecklist: () => Promise<any>;
}
