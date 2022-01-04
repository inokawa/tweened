import React, {
  useRef,
  memo,
  useLayoutEffect,
  createElement,
  useMemo,
  useContext,
} from "react";
import { toKey, Tween, TweenTarget, Value } from "./backends/types";
import { TweenOpts, startTween } from "./backends/js";
import { useForceRefresh, useResettableRef } from "./hooks";
import {
  TransitionKeyContext,
  TransitionRemoveContext,
  TransitionState,
  TransitionStateContext,
} from "./transition";

const isEventHandlerName = (name: string): name is EventHandlerName =>
  name.indexOf("on") === 0;

type EventHandlerName = `on${string}`;

export type TweenRender<P extends object, TP extends object> = (
  props: Omit<P & TP, "children" | EventHandlerName>,
  ctx: { state: TransitionState }
) => ConfigProps<TP> | ConfigProps<TP>[];

type Target = {
  tweens: TweenTarget[];
  lastTween?: Tween;
};

export type TweenableValue<V extends string | number = string | number> =
  | [V]
  | [V, V];

type ConfigProp<V extends any> = V extends string
  ? V | TweenableValue<string>
  : V extends number
  ? V | TweenableValue<number>
  : V;

type ConfigProps<P extends object> = {
  [K in keyof Omit<P, "key">]: K extends "style"
    ? { [SK in keyof P[K]]: ConfigProp<P[K][SK]> }
    : ConfigProp<P[K]>;
};

const isTweenableValue = (v: any[]): v is TweenableValue =>
  !!v.length && v.every((a) => typeof a === "number" || typeof a === "string");

type TweenableElement = keyof JSX.IntrinsicElements | React.ComponentType<any>;

const getPrevValue = (
  prevTarget: Target | null,
  type: string,
  key: string
): Value | undefined => {
  if (!prevTarget) return;
  const prevTweens = prevTarget.lastTween?.get();
  const prevKey = toKey(type, key);
  const prevIndex = prevTarget.tweens.findIndex(
    (tw) => toKey(tw.type, tw.key) === prevKey
  );
  return prevTweens?.[prevIndex];
};

const assignValue = <T extends object>(
  key: string,
  value: ConfigProps<T>[keyof ConfigProps<T>],
  type: TweenTarget["type"],
  fromProps: T,
  toProps: T,
  prevTarget: Target | null,
  target: React.MutableRefObject<Target>,
  prevProps: T | null
) => {
  if (Array.isArray(value)) {
    if (isTweenableValue(value)) {
      let startValue: Value;
      let endValue: Value;
      if (value.length === 1) {
        endValue = value[0];
        startValue =
          getPrevValue(prevTarget, type, key) ??
          (prevProps as any)?.[key] ??
          endValue;
      } else {
        endValue = value[1];
        startValue = value[0];
      }
      target.current.tweens.push({
        type,
        key: key,
        value: [endValue, startValue],
      });
      (fromProps as any)[key] = startValue;
      (toProps as any)[key] = endValue;
    } else {
      // NOP
    }
  } else {
    (fromProps as any)[key] = value;
    (toProps as any)[key] = value;
  }
};

const assignProps = <T extends object>(
  tempProps: ConfigProps<T>,
  fromProps: T,
  toProps: T,
  prevTarget: Target | null,
  target: React.MutableRefObject<Target>,
  prevProps: T | null
) => {
  Object.keys(tempProps).forEach((k) => {
    const p = (tempProps as ConfigProps<T>)[k as keyof ConfigProps<T>];
    if (k === "children") {
    } else if (k === "style") {
      const fromStyle = ((fromProps as any)[k] = {});
      const toStyle = ((toProps as any)[k] = {});
      Object.keys(p).forEach((sk) => {
        const sp = p[sk as keyof typeof p];
        assignValue(
          sk,
          sp as any,
          "style",
          fromStyle,
          toStyle,
          prevTarget,
          target,
          (prevProps as any)?.[k]
        );
      });
    } else {
      assignValue(
        k,
        p,
        "attr",
        fromProps,
        toProps,
        prevTarget,
        target,
        prevProps
      );
    }
  });
};

const cache = new Map<TweenableElement, any>();

export type TweenedProps<P> = P & {
  trans?: "enter" | "update" | "exit";
  children?: React.ReactNode;
  onTweenStart?: () => void;
  onTweenEnd?: () => void;
} & TweenOpts;

export const tweened = <T extends TweenableElement>(element: T) => {
  if (cache.has(element)) {
    return cache.get(element)! as typeof createComponent;
  }

  const createComponent = <
    P extends object,
    TP extends object = T extends keyof JSX.IntrinsicElements
      ? JSX.IntrinsicElements[T]
      : T extends React.ComponentType<any>
      ? React.ComponentProps<T>
      : object
  >(
    render: TweenRender<P, TP>,
    opts: TweenOpts = {}
  ) => {
    return memo(
      ({
        children,
        trans,
        ease,
        duration,
        delay,
        onTweenStart,
        onTweenEnd,
        ...props
      }: TweenedProps<P & TP>): React.ReactElement | null => {
        const refresh = useForceRefresh();
        const ref = useRef<any>(null);
        const target = useRef<Target>(null!);
        const prevProps = useRef<TP | null>(null);
        const nextProps = useRef<TP | null>(null);
        const visible = useRef(true);

        const transitionState = useContext(TransitionStateContext);
        const transitionKey = useContext(TransitionKeyContext);
        const transitionRemove = useContext(TransitionRemoveContext);

        const prevTarget: typeof target.current | null = target.current;
        target.current = { tweens: [] };

        if (transitionState !== "exit") {
          visible.current = true;
        }

        const attrs = {} as { [key: string]: any };
        const eventHandlers = {} as { [key: string]: any };
        Object.keys(props).forEach((k) => {
          const v = props[k as keyof typeof props];
          if (isEventHandlerName(k)) {
            eventHandlers[k] = v;
          } else {
            attrs[k] = v;
          }
        });

        const configProps = useMemo(
          () => render(attrs as P & TP, { state: transitionState }),
          [transitionState, ...Object.values(attrs)]
        );
        const [index, setIndex] = useResettableRef(0, configProps);

        let lastIndex: number | null = null;
        let fromProps = eventHandlers as TP;
        const toProps = { ...eventHandlers } as TP;
        try {
          if (!nextProps.current) {
            let targetConfigProps: ConfigProps<TP>;
            if (Array.isArray(configProps)) {
              lastIndex = configProps.length - 1;
              targetConfigProps = configProps[index];
            } else {
              targetConfigProps = configProps;
            }
            assignProps(
              targetConfigProps,
              fromProps,
              toProps,
              prevTarget,
              target,
              prevProps.current
            );
          } else {
            fromProps = nextProps.current;
          }
        } catch (e) {
          throw e;
        }

        (fromProps as any).ref = ref;

        useLayoutEffect(() => {
          if (!visible.current) {
            return;
          }
          let aborted = false;
          if (target.current.tweens.length) {
            onTweenStart?.();

            const tween = (target.current.lastTween = startTween(
              ref.current,
              target.current.tweens,
              {
                duration: duration ?? opts.duration,
                ease: ease ?? opts.ease,
                delay: delay ?? opts.delay,
              }
            ));

            (async () => {
              try {
                await tween.end();
                if (aborted) return;
                if (lastIndex != null && index < lastIndex) {
                  setIndex(index + 1);
                } else {
                  nextProps.current = toProps;
                }
                refresh();
              } catch (e) {
                // NOP
              }
            })();
          } else {
            if (nextProps.current) {
              nextProps.current = null;
              if (transitionState === "exit") {
                visible.current = false;
                transitionRemove(transitionKey);
                refresh();
              }
              onTweenEnd?.();
            }
          }
          return () => {
            aborted = true;
          };
        });

        if (!visible.current) {
          prevProps.current = null;
          return null;
        }
        prevProps.current = fromProps;
        return createElement(element, fromProps, children);
      }
    );
  };

  cache.set(element, createComponent);
  return createComponent;
};
