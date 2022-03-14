export interface GqlQueryParams<T = undefined> {
  query: string;
  variables: {
    [k: string]: string | number | boolean | undefined | T;
  };
}

export interface GqlResponse<T> {
  /**
   * Data returned from the GraphQL query. If no data is returned, assume an error occurred.
   */
  data: T;

  /**
   * Collection of errors that occurred during the query. Presence of this
   * property does not mean the whole query failed, only that some parts did
   * fail.
   */
  errors?: {
    /**
     * The path to the error. Either a path segment (string) or index (number) if returning multiple results.
     * eg. ['user', 'card', 0, 'id'] represents user.card[0].id
     */
    path: (string | number)[];
    message: string;
    locations: {
      column: number;
      line: number;
    };
  }[];
}
