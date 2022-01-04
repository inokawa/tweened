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
import { useForceRefresh, useResettableState } from "./hooks";
import {
  TransitionKeyContext,
  TransitionRemoveContext,
  TransitionState,
  TransitionStateContext,
} from "./transition";

export type TweenRender<P extends object, EP extends object> = (
  props: P,
  ctx: { state: TransitionState }
) => ConfigProps<EP> | ConfigProps<EP>[];

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

const assignProps = <T extends object>(
  tempProps: ConfigProps<T>,
  toProps: T,
  prevTarget: Target | null,
  target: React.MutableRefObject<Target>,
  prevProps: T | null
): T => {
  const fromProps = {} as T;
  Object.keys(tempProps).forEach((k) => {
    const p = (tempProps as ConfigProps<T>)[k as keyof ConfigProps<T>];
    if (k === "children") {
    } else if (k === "style") {
      (fromProps as any)[k] = {};
      (toProps as any)[k] = {};
      Object.keys(p).forEach((sk) => {
        const sp = p[sk as keyof typeof p];
        if (Array.isArray(sp)) {
          if (isTweenableValue(sp)) {
            let startValue: Value;
            let endValue: Value;
            if (sp.length === 1) {
              endValue = sp[0];
              startValue =
                getPrevValue(prevTarget, "style", sk) ??
                (prevProps as any)?.[k]?.[sk] ??
                endValue;
            } else {
              endValue = sp[1];
              startValue = sp[0];
            }
            target.current.tweens.push({
              type: "style",
              key: sk,
              value: [endValue, startValue],
            });
            (fromProps as any)[k][sk] = startValue;
            (toProps as any)[k][sk] = endValue;
          } else {
            // NOP
          }
        } else {
          (fromProps as any)[k][sk] = sp;
          (toProps as any)[k][sk] = sp;
        }
      });
    } else {
      if (Array.isArray(p)) {
        if (isTweenableValue(p)) {
          let startValue: Value;
          let endValue: Value;
          if (p.length === 1) {
            endValue = p[0];
            startValue =
              getPrevValue(prevTarget, "attr", k) ??
              (prevProps as any)?.[k] ??
              endValue;
          } else {
            endValue = p[1];
            startValue = p[0];
          }
          target.current.tweens.push({
            type: "attr",
            key: k,
            value: [endValue, startValue],
          });
          (fromProps as any)[k] = startValue;
          (toProps as any)[k] = endValue;
        } else {
          // NOP
        }
      } else {
        (fromProps as any)[k] = p;
        (toProps as any)[k] = p;
      }
    }
  });
  return fromProps;
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
      }: TweenedProps<P>): React.ReactElement | null => {
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

        const configProps = useMemo(
          () => render(props as P, { state: transitionState }),
          [transitionState, ...Object.values(props)]
        );
        const [index, setIndex] = useResettableState(0, configProps);

        let lastIndex: number | null = null;
        let fromProps: TP;
        const toProps = {} as TP;
        try {
          if (!nextProps.current) {
            let targetConfigProps: ConfigProps<TP>;
            if (Array.isArray(configProps)) {
              lastIndex = configProps.length - 1;
              targetConfigProps = configProps[index];
            } else {
              targetConfigProps = configProps;
            }
            fromProps = assignProps(
              targetConfigProps,
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
                  refresh();
                }
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
