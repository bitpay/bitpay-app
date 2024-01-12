export interface AppIdentity {
  /**
   * Timestamp when this identity was generated, in seconds.
   * To convert to date, multiply by 1000 eg. new Date(identity.created * 1000)
   */
  created?: number;

  /**
   * Private signing key.
   */
  priv: string | Uint8Array;

  /**
   * Public signing key.
   */
  pub: string | Uint8Array;

  /**
   * The System Information Number (SIN) associated with this identity public/private key pair.
   */
  sin: string;
}

export interface HomeCarouselConfig {
  id: string;
  show: boolean;
}

export type HomeCarouselLayoutType = 'carousel' | 'listView';

export type InAppNotificationContextType = 'notification';
