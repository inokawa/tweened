import {
  createContext,
  Fragment,
  useRef,
  Children,
  useCallback,
  useEffect,
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
) => (
  <TransitionStateContext.Provider key={key} value={state}>
    <TransitionKeyContext.Provider value={key}>
      <TransitionRemoveContext.Provider value={removeNode}>
        {children}
      </TransitionRemoveContext.Provider>
    </TransitionKeyContext.Provider>
  </TransitionStateContext.Provider>
);

export const Transition = ({
  children,
}: TransitionProps): React.ReactElement => {
  const prevElemsRef = useRef<React.ReactElement[]>(null!);
  const elemsRef = useRef<React.ReactElement[]>(null!);
  const prevElems = elemsRef.current || [];
  const elems = Children.map(children, (c) => c);

  useEffect(() => {
    prevElemsRef.current = prevElems;
    elemsRef.current = elems;
  });

  const elemsByKey = toMap(elems);
  const prevElemsByKey = toMap(prevElems);

  const removeNode = useCallback((k: string | number) => {
    prevElemsRef.current = prevElemsRef.current.filter((c) => c.key !== k);
  }, []);

  const res: React.ReactElement[] = [];
  prevElems.forEach((v, i) => {
    const k = v.key ?? i;
    if (elemsByKey[k]) {
      // update
      res.push(createProvider("update", k, elemsByKey[k], removeNode));
    } else {
      // exit
      res.push(createProvider("exit", k, v, removeNode));
    }
  });
  elems.forEach((v, i) => {
    const k = v.key ?? i;
    if (prevElemsByKey[k]) {
      // update
    } else {
      // enter
      res.push(createProvider("enter", k, v, removeNode));
    }
  });

  return <Fragment>{res}</Fragment>;
};
