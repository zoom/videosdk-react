import React from "react";

// util from https://github.com/kentcdodds/use-deep-compare-effect
type UseEffectParams = Parameters<typeof React.useEffect>;
type EffectCallback = UseEffectParams[0];
type DependencyList = UseEffectParams[1];

function useDeepCompareMemoize<T>(value: T) {
  const ref = React.useRef<T>(value);
  const signalRef = React.useRef<number>(0);
  if (!dequal(value, ref.current)) {
    ref.current = value;
    signalRef.current += 1;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => ref.current, [signalRef.current]);
}

function useDeepCompareEffect(callback: EffectCallback, dependencies: DependencyList) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useEffect(callback, useDeepCompareMemoize(dependencies));
}

export { useDeepCompareEffect };

var has = Object.prototype.hasOwnProperty;

function find(iter: any, tar: any, key?: unknown) {
  for (key of iter.keys()) {
    if (dequal(key, tar)) return key;
  }
}

// util from https://github.com/lukeed/dequal
function dequal(foo: any, bar: any) {
  var ctor, len, tmp;
  if (foo === bar) return true;

  if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
    if (ctor === Date) return foo.getTime() === bar.getTime();
    if (ctor === RegExp) return foo.toString() === bar.toString();

    if (ctor === Array) {
      if ((len = foo.length) === bar.length) {
        while (len-- && dequal(foo[len], bar[len]));
      }
      return len === -1;
    }

    if (ctor === Set) {
      if (foo.size !== bar.size) {
        return false;
      }
      for (len of foo) {
        tmp = len;
        if (tmp && typeof tmp === 'object') {
          tmp = find(bar, tmp);
          if (!tmp) return false;
        }
        if (!bar.has(tmp)) return false;
      }
      return true;
    }

    if (ctor === Map) {
      if (foo.size !== bar.size) {
        return false;
      }
      for (len of foo) {
        tmp = len[0];
        if (tmp && typeof tmp === 'object') {
          tmp = find(bar, tmp);
          if (!tmp) return false;
        }
        if (!dequal(len[1], bar.get(tmp))) {
          return false;
        }
      }
      return true;
    }

    if (ctor === ArrayBuffer) {
      foo = new Uint8Array(foo);
      bar = new Uint8Array(bar);
    } else if (ctor === DataView) {
      if ((len = foo.byteLength) === bar.byteLength) {
        while (len-- && foo.getInt8(len) === bar.getInt8(len));
      }
      return len === -1;
    }

    if (ArrayBuffer.isView(foo)) {
      if ((len = foo.byteLength) === bar.byteLength) {
        // @ts-expect-error - library code
        while (len-- && foo[len] === bar[len]);
      }
      return len === -1;
    }

    if (!ctor || typeof foo === 'object') {
      len = 0;
      for (ctor in foo) {
        if (has.call(foo, ctor) && ++len && !has.call(bar, ctor)) return false;
        if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor])) return false;
      }
      return Object.keys(bar).length === len;
    }
  }

  return foo !== foo && bar !== bar;
}
