import {debounce, throttle} from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('invokes once with the last arguments after the wait', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced('a');
    debounced('b');
    jest.advanceTimersByTime(299);
    expect(func).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith('b');
  });

  it('restarts the wait on every call', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced();
    jest.advanceTimersByTime(200);
    debounced();
    jest.advanceTimersByTime(200);
    expect(func).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('with leading only, invokes immediately and ignores calls until the wait passes without calls', () => {
    const func = jest.fn();
    const debounced = debounce(func, 800, {leading: true, trailing: false});

    debounced('first');
    expect(func).toHaveBeenCalledWith('first');

    jest.advanceTimersByTime(500);
    debounced('second');
    jest.advanceTimersByTime(500);
    debounced('third');
    jest.advanceTimersByTime(800);
    expect(func).toHaveBeenCalledTimes(1);

    debounced('fourth');
    expect(func).toHaveBeenCalledTimes(2);
    expect(func).toHaveBeenLastCalledWith('fourth');
  });

  it('with leading and trailing, invokes on both edges only when called again during the wait', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300, {leading: true});

    debounced('first');
    expect(func).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(300);
    expect(func).toHaveBeenCalledTimes(1);

    debounced('second');
    debounced('third');
    expect(func).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(300);
    expect(func).toHaveBeenCalledTimes(3);
    expect(func).toHaveBeenLastCalledWith('third');
  });

  it('cancel drops the pending invocation', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced();
    debounced.cancel();
    jest.advanceTimersByTime(300);
    expect(func).not.toHaveBeenCalled();
  });

  it('flush invokes the pending invocation immediately and returns its result', () => {
    const func = jest.fn((value: string) => value.toUpperCase());
    const debounced = debounce(func, 300);

    debounced('pending');
    expect(debounced.flush()).toBe('PENDING');
    expect(func).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(300);
    expect(func).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('invokes on the leading edge and at most once per wait while called continuously', () => {
    const func = jest.fn();
    const throttled = throttle(func, 100);

    throttled(0);
    expect(func).toHaveBeenCalledTimes(1);

    for (let elapsed = 10; elapsed <= 250; elapsed += 10) {
      jest.advanceTimersByTime(10);
      throttled(elapsed);
    }
    expect(func).toHaveBeenCalledTimes(3);

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(4);
    expect(func).toHaveBeenLastCalledWith(250);
  });
});
