import {ToDogeAddress} from './address';

/**
 * toDogeAddress Tests
 */
describe('toDogeAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will respond with the address without prefix if not provided', async () => {
    const result = ToDogeAddress('DDTtqnuZ5kfRT5qh2c7sNtqrJmV3iXYdGG');
    expect(result).toEqual('DDTtqnuZ5kfRT5qh2c7sNtqrJmV3iXYdGG');
  });

  it('will throw a fatal error if not getting a valid address', async () => {
    expect(() => {
      ToDogeAddress('DDTtqnuZ5kfRT');
    }).toThrow();
  });
});
