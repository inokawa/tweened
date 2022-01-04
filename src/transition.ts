import React, {
  createContext,
  Fragment,
  createElement,
  useRef,
  Children,
  useCallback,
} from "react";
import { NOP } from "./utils";

const toMap = (elements: React.ReactElement[]) =>
  elements.reduce((acc, e, i) => {
    acc[e.key ?? i] = e;
    return acc;
  }, {} as { [key: string]: React.ReactElement });

export type TransitionState = "update" | "enter" | "exit";
export const TransitionStateContext = createContext<TransitionState>("update");
export const TransitionKeyContext = createContext<string | number>("");
export const TransitionRemoveContext =
  createContext<(key: string | number) => void>(NOP);

export type TransitionProps = {
  children: React.ReactElement | React.ReactElement[];
};

const createProvider = (
  state: TransitionState,
  key: React.Key,
  children: React.ReactElement,
  removeNode: (key: string | number) => void
) =>
  createElement(
    TransitionStateContext.Provider,
    { key: key, value: state },
    createElement(
      TransitionKeyContext.Provider,
      { value: key },
      createElement(
        TransitionRemoveContext.Provider,
        { value: removeNode },
        children
      )
    )
  );

export const Transition = ({
  children,
}: TransitionProps): React.ReactElement => {
  const prevElems = useRef<React.ReactElement[]>(null!);
  const elems = useRef<React.ReactElement[]>(null!);
  prevElems.current = elems.current || [];
  elems.current = Children.map(children, (c) => c);

  const elemsByKey = toMap(elems.current);
  const prevElemsByKey = toMap(prevElems.current);

  const removeNode = useCallback((k: string | number) => {
    prevElems.current = prevElems.current.filter((c) => c.key !== k);
  }, []);

  const res: React.ReactElement[] = [];
  prevElems.current.forEach((v, i) => {
    const k = v.key ?? i;
    if (elemsByKey[k]) {
      // update
      res.push(createProvider("update", k, elemsByKey[k], removeNode));
    } else {
      // exit
      res.push(createProvider("exit", k, v, removeNode));
    }
  });
  elems.current.forEach((v, i) => {
    const k = v.key ?? i;
    if (prevElemsByKey[k]) {
      // update
    } else {
      // enter
      res.push(createProvider("enter", k, v, removeNode));
    }
  });

  return createElement(Fragment, null, res);
};
