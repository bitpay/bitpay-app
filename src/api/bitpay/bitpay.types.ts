export interface BpApiResponse<T> {
  data: T;
  error?: any;
}

export interface CreateTokenResponse {
  data: string;
}
