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
      res.push(
        <TransitionStateContext.Provider key={k} value="update">
          <TransitionKeyContext.Provider value={k}>
            <TransitionRemoveContext.Provider value={removeNode}>
              {elemsByKey[k]}
            </TransitionRemoveContext.Provider>
          </TransitionKeyContext.Provider>
        </TransitionStateContext.Provider>
      );
    } else {
      // exit
      res.push(
        <TransitionStateContext.Provider key={k} value="exit">
          <TransitionKeyContext.Provider value={k}>
            <TransitionRemoveContext.Provider value={removeNode}>
              {v}
            </TransitionRemoveContext.Provider>
          </TransitionKeyContext.Provider>
        </TransitionStateContext.Provider>
      );
    }
  });
  elems.current.forEach((v, i) => {
    const k = v.key ?? i;
    if (prevElemsByKey[k]) {
      // update
    } else {
      // enter
      res.push(
        <TransitionStateContext.Provider key={k} value="enter">
          <TransitionKeyContext.Provider value={k}>
            <TransitionRemoveContext.Provider value={removeNode}>
              {v}
            </TransitionRemoveContext.Provider>
          </TransitionKeyContext.Provider>
        </TransitionStateContext.Provider>
      );
    }
  });

  return createElement(Fragment, null, res);
};
