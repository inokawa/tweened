import { useState, useCallback } from "react";

export const useForceRefresh = () => {
  const setState = useState(0)[1];
  return useCallback(() => setState((p) => p + 1), []);
};
