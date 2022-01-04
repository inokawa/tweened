import { useState, useCallback, useRef, useEffect } from "react";

export const useForceRefresh = () => {
  const setState = useState(0)[1];
  return useCallback(() => setState((p) => p + 1), []);
};

export const useResettableRef = <T, D>(
  initialValue: T,
  dep: D
): [T, (value: T) => void] => {
  const value = useRef(initialValue);
  const prevDep = useRef<D>(null!);
  if (dep !== prevDep.current) {
    value.current = initialValue;
  }
  useEffect(() => {
    prevDep.current = dep;
  });

  return [
    value.current,
    useCallback((v: T) => {
      value.current = v;
    }, []),
  ];
};
