import { useState, useCallback } from "react";

export const useForceRefresh = (): [number, () => void] => {
  const [count, setState] = useState(0);
  return [count, useCallback(() => setState((p) => p + 1), [])];
};
