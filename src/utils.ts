import React from 'react'
import { dequal as deepEqual } from 'dequal'

// util from https://github.com/kentcdodds/use-deep-compare-effect
type UseEffectParams = Parameters<typeof React.useEffect>
type EffectCallback = UseEffectParams[0]
type DependencyList = UseEffectParams[1]

function useDeepCompareMemoize<T>(value: T) {
    const ref = React.useRef<T>(value)
    const signalRef = React.useRef<number>(0)
    if (!deepEqual(value, ref.current)) {
        ref.current = value
        signalRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return React.useMemo(() => ref.current, [signalRef.current])
}

function useDeepCompareEffect(callback: EffectCallback, dependencies: DependencyList) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return React.useEffect(callback, useDeepCompareMemoize(dependencies))
}

export { useDeepCompareEffect }