/**
 * Metro polyfill — included ONLY in perf builds (see metro.config.js).
 *
 * Answers "how much JavaScript runs before the app is usable, and which modules
 * cost the most". Metro defines every module through `__d(factory, id, ...)`
 * and runs the factory on first `require`; wrapping the factory records when
 * each module initialised and how long it took.
 *
 * Self time is inclusive time minus the time spent initialising the modules it
 * required, so a module is charged for its own top-level work and not for its
 * dependencies'. Records are flat [id, selfMs, startMs] triples to keep the
 * per-module overhead to an array push.
 *
 * Runs as a polyfill: after Metro's module system has installed `__d`, before
 * any module is defined. It must not depend on anything else in the bundle.
 */
/* global globalThis */
(function (global) {
  var define = global.__d;
  if (typeof define !== 'function') {
    return;
  }

  var now =
    typeof global.nativePerformanceNow === 'function'
      ? global.nativePerformanceNow
      : Date.now;

  var stats = {origin: now(), count: 0, records: []};
  var childTime = [];

  global.__BP_MODULE_STATS__ = stats;

  global.__d = function (factory) {
    var args = Array.prototype.slice.call(arguments);
    args[0] = function () {
      var started = now();
      childTime.push(0);
      try {
        return factory.apply(this, arguments);
      } finally {
        var inclusive = now() - started;
        var children = childTime.pop();
        if (childTime.length) {
          childTime[childTime.length - 1] += inclusive;
        }
        stats.count++;
        stats.records.push(args[1], inclusive - children, started - stats.origin);
      }
    };
    return define.apply(this, args);
  };
})(
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
    ? global
    : this,
);
