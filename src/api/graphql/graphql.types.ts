export interface GqlQueryParams {
  query: string;
  variables: {
    [k: string]: string | number | boolean;
  };
}

export interface GqlResponse<T> {
  data: T;
  errors?: {
    locations: {
      column: number;
      line: number;
    };
    message: string;
  }[];
}
