import {DoshBrandDetailsHeaderStyle, DoshLogoStyle} from './types';

/**
 * An options object used to configure the Dosh Android SDK UI.
 */
class DoshUiOptions {
  /**
   * The title displayed in the Dosh UI header.
   */
  feedTitle: string;

  /**
   * How each brand's logo is displayed on the brand details page.
   */
  logoStyle: DoshLogoStyle;

  /**
   * How each brand's header image is displayed on the brand details page. 'DIAGONAL' displays at a slant and positions the logo on the right. 'RECTANGLE' displays as a rectangle and positions the logo in the center.
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

export default DoshUiOptions;
