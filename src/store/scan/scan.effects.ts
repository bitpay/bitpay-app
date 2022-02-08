import {Effect} from '../index';
export const incomingData =
  ({data}: {data: string}): Effect<Promise<void>> =>
  async () => {
    // TODO incoming data handler
    console.log(data);
  };
