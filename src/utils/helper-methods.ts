export const sleep = async (duration: number) =>
  await new Promise(resolve => setTimeout(resolve, duration));
