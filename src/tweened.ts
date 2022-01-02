import React, { useRef, memo, useLayoutEffect, createElement } from "react";
import { toKey, TweenObject, Tween, Value } from "./backends/types";
import { TweenOpts, startTween } from "./backends/js";
import { useForceRefresh } from "./hooks";

export type TweenRender<P extends object, EP extends object> = (
  props: P
) => TweenableProps<EP> | TweenableProps<EP>[];

type Target = {
  tweens: Tween[];
  lastTween?: TweenObject;
};

export type TweenValue<V extends string | number = string | number> =
  | [V]
  | [V, V];

type TweenableProp<V extends any> = V extends string
  ? V | TweenValue<string>
  : V extends number
  ? V | TweenValue<number>
  : V;

type TweenableProps<P extends object> = {
  [K in keyof Omit<P, "key">]: K extends "style"
    ? { [SK in keyof P[K]]: TweenableProp<P[K][SK]> }
    : TweenableProp<P[K]>;
};

const isTweenValue = (v: any[]): v is TweenValue =>
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
  tempProps: TweenableProps<T>,
  toProps: T,
  prevTarget: Target | null,
  target: React.MutableRefObject<Target>,
  prevNode: React.ReactElement | null
): T => {
  const fromProps = {} as T;
  Object.keys(tempProps).forEach((k) => {
    const p = (tempProps as TweenableProps<T>)[k as keyof TweenableProps<T>];
    if (k === "children") {
    } else if (k === "style") {
      (fromProps as any)[k] = {};
      (toProps as any)[k] = {};
      Object.keys(p).forEach((sk) => {
        const sp = p[sk as keyof typeof p];
        if (Array.isArray(sp)) {
          if (isTweenValue(sp)) {
            let startValue: Value | undefined;
            let endValue: Value;
            if (sp.length === 1) {
              startValue = undefined;
              endValue = sp[0];
            } else {
              startValue = sp[0];
              endValue = sp[1];
            }
            target.current.tweens.push({
              type: "style",
              key: sk,
              value: [endValue, startValue],
            });
            (fromProps as any)[k][sk] =
              getPrevValue(prevTarget, "style", sk) ??
              prevNode?.props[k]?.[sk] ??
              endValue;
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
        if (isTweenValue(p)) {
          let startValue: Value | undefined;
          let endValue: Value;
          if (p.length === 1) {
            startValue = undefined;
            endValue = p[0];
          } else {
            startValue = p[0];
            endValue = p[1];
          }
          target.current.tweens.push({
            type: "attr",
            key: k,
            value: [endValue, startValue],
          });
          (fromProps as any)[k] =
            getPrevValue(prevTarget, "attr", k) ??
            prevNode?.props[k] ??
            endValue;
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
    return cache.get(element)! as typeof Comp;
  }

  type EP = T extends keyof JSX.IntrinsicElements
    ? JSX.IntrinsicElements[T]
    : T extends React.ComponentType<any>
    ? React.ComponentProps<T>
    : never;

  const Comp = <P extends object>(
    render: TweenRender<P, EP>,
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
      }: TweenedProps<P>): React.ReactElement => {
        const refresh = useForceRefresh();
        const ref = useRef<any>(null);
        const prevNode = useRef<React.ReactElement | null>(null);
        const target = useRef<Target>(null!);
        const nextProps = useRef<EP | null>(null);

        const prevTarget: typeof target.current | null = target.current;
        target.current = { tweens: [] };

        let fromProps: EP;
        const toProps = {} as EP;
        try {
          if (!nextProps.current) {
            let tempProps = render(props as P);
            if (Array.isArray(tempProps)) {
              // TODO
              fromProps = tempProps[0] as any;
            } else {
              fromProps = assignProps(
                tempProps,
                toProps,
                prevTarget,
                target,
                prevNode.current
              );
            }
          } else {
            fromProps = nextProps.current;
          }
        } catch (e) {
          throw e;
        }

        (fromProps as any).ref = ref;

        useLayoutEffect(() => {
          let revoked = false;
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
                if (revoked) return;
                nextProps.current = toProps;
                refresh();
              } catch (e) {
                // NOP
              }
            })();
          } else {
            if (nextProps.current) {
              nextProps.current = null;
              onTweenEnd?.();
            }
          }
          return () => {
            revoked = true;
          };
        });

        return (prevNode.current = createElement(element, fromProps, children));
      }
    );
  };

  cache.set(element, Comp);
  return Comp;
};
