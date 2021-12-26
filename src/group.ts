import React, {
  createElement,
  Children,
  cloneElement,
  useCallback,
  useContext,
  useRef,
} from "react";
import { TweenedProps } from ".";
import { useForceRefresh, useResettableState } from "./hooks";
import {
  TransitionKeyContext,
  TransitionRemoveContext,
  TransitionStateContext,
} from "./transition";

type MounterProps = {
  children: React.ReactElement[];
  exit: boolean;
  onEnd: () => void;
};

const Mounter = ({ children, exit, onEnd }: MounterProps) => {
  const visible = useRef(true);
  const refresh = useForceRefresh();
  const [index, setIndex] = useResettableState(0, children);
  const target = children[index];

  const lastIndex = children.length - 1;
  const onTweenEnd = useCallback(() => {
    target.props.onTweenEnd?.();
    if (index < lastIndex) {
      setIndex(index + 1);
    } else {
      if (exit) {
        visible.current = false;
        refresh();
        onEnd();
      }
    }
  }, [target, lastIndex, index, onEnd]);

  if (!exit) {
    visible.current = true;
  }
  if (!visible.current) {
    return null;
  }

  if (!target) return null;
  return cloneElement(target, {
    onTweenEnd,
  });
};

export type TweenGroupProps = {
  children: React.ReactElement | React.ReactElement[];
};

export const TweenGroup = ({
  children,
}: TweenGroupProps): React.ReactElement => {
  const transitionState = useContext(TransitionStateContext);
  const transitionKey = useContext(TransitionKeyContext);
  const transitionRemove = useContext(TransitionRemoveContext);

  const onEnd = useCallback(() => {
    transitionRemove(transitionKey);
  }, [transitionRemove, transitionKey]);

  const elems: React.ReactElement[] = [];
  Children.forEach(children, (c) => {
    const trans = (c.props as TweenedProps<object>).trans ?? "update";
    if (transitionState === "enter") {
      if (trans === "enter") {
        elems.push(c);
      }
    } else if (transitionState === "exit") {
      if (trans === "exit") {
        elems.push(c);
      }
    } else {
      if (trans === "update") {
        elems.push(c);
      }
    }
  });

  return createElement(Mounter, {
    exit: transitionState === "exit",
    onEnd,
    children: elems,
  });
};
