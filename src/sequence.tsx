import React, { Children, cloneElement, useCallback } from "react";
import { useResettableState } from "./hooks";

export type SequenceProps = {
  children: React.ReactElement | React.ReactElement[];
};

export const Sequence = ({ children }: SequenceProps) => {
  const [index, setIndex] = useResettableState(0, children);

  const elems = Children.toArray(children) as React.ReactElement[];
  const target = elems[index];
  const length = elems.length - 1;
  const onTweenEnd = useCallback(() => {
    target.props.onTweenEnd?.();
    if (index < length) {
      setIndex(index + 1);
    }
  }, [target, length, index]);

  return cloneElement(target, {
    onTweenEnd,
  });
};
