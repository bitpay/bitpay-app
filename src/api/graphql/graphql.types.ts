export interface GqlQueryParams {
  query: string;
  variables: {
    [k: string]: string;
  };
}

export interface GqlResponse<T> {
  data: T;
  errors?: any;
}
