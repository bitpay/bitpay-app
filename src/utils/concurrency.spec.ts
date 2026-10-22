import {mapWithConcurrency} from './concurrency';

const flushMicrotasks = () => new Promise(resolve => setImmediate(resolve));

describe('mapWithConcurrency', () => {
  it('returns an empty array for an empty input', async () => {
    const task = jest.fn();
    await expect(mapWithConcurrency([], 5, task)).resolves.toEqual([]);
    expect(task).not.toHaveBeenCalled();
  });

  it('resolves results in input order regardless of completion order', async () => {
    const delays = [40, 10, 30, 0, 20];
    const result = await mapWithConcurrency(
      delays,
      2,
      (delay, index) =>
        new Promise<number>(resolve => setTimeout(() => resolve(index), delay)),
    );
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it('runs every item when there are more items than the limit', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const result = await mapWithConcurrency(items, 3, async item => item * 2);
    expect(result).toEqual([2, 4, 6, 8, 10, 12, 14]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const resolvers: Array<() => void> = [];

    const pending = mapWithConcurrency(
      Array.from({length: 9}, (_, i) => i),
      3,
      () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise<void>(resolve => {
          resolvers.push(() => {
            inFlight--;
            resolve();
          });
        });
      },
    );

    await flushMicrotasks();
    expect(maxInFlight).toBe(3);

    while (resolvers.length) {
      resolvers.shift()!();
      await flushMicrotasks();
    }
    await pending;
    expect(maxInFlight).toBe(3);
  });

  it('uses a single worker when the limit is below one', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await mapWithConcurrency([1, 2, 3], 0, async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await flushMicrotasks();
      inFlight--;
    });
    expect(maxInFlight).toBe(1);
  });

  it('rejects when a task rejects', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async item => {
        if (item === 2) {
          throw new Error('boom');
        }
        return item;
      }),
    ).rejects.toThrow('boom');
  });
});
