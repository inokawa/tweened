import React, { cloneElement, useCallback, useRef } from "react";
import { useForceRefresh } from "./hooks";

export type SequenceProps = {
  children: React.ReactElement[];
};

export const Sequence = ({ children }: SequenceProps) => {
  const refresh = useForceRefresh();
  const index = useRef(0);
  const prevChildren = useRef<React.ReactElement[]>(null!);
  if (children !== prevChildren.current) {
    index.current = 0;
  }
  prevChildren.current = children;

  const target = children[index.current];
  const length = children.length - 1;
  const onTweenEnd = useCallback(() => {
    target.props.onTweenEnd?.();
    if (index.current < length) {
      index.current += 1;
      refresh();
    }
  }, [target, length, index]);

  return cloneElement(target, {
    onTweenEnd,
  });
};
