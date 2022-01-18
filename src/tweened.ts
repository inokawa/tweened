import React, {
  useRef,
  memo,
  useLayoutEffect,
  createElement,
  useEffect,
} from "react";
import { toKey, Tween, TweenTarget, Value } from "./backends/types";
import { TweenOpts, startTween } from "./backends/js";
import { useForceRefresh } from "./hooks";

const isEventHandlerName = (name: string): name is EventHandlerName =>
  name.indexOf("on") === 0;

type EventHandlerName = `on${string}`;

type Target = {
  tweens: TweenTarget[];
  lastTween?: Tween;
};

export type TweenableValue<V extends string | number = string | number> =
  | [V]
  | [V, V];

type ConfigProp<V extends any> = V extends string | number
  ? V | TweenableValue<V>
  : V;

type ConfigProps<P extends object> = {
  [K in keyof P]: P[K] extends object
    ? { [KK in keyof P[K]]: ConfigProp<P[K][KK]> }
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
  target: Target,
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
      target.tweens.push({
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
  props: ConfigProps<T>,
  fromProps: T,
  toProps: T,
  prevTarget: Target | null,
  target: Target,
  prevProps: T | null
) => {
  Object.keys(props).forEach((k) => {
    const p = props[k as keyof ConfigProps<T>];
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

export type TweenedProps = {
  trans?: "enter" | "update" | "exit";
  onTweenStart?: () => void;
  onTweenEnd?: () => void;
} & TweenOpts;

type TweenableProps<P extends object> = ConfigProps<P> & TweenedProps;

export type TweenableComponent<P extends object> = React.MemoExoticComponent<
  (props: TweenableProps<P>) => React.ReactElement | null
>;

const createComponent = <T extends TweenableElement>(
  element: T,
  opts: TweenOpts = {}
) => {
  type P = React.ComponentProps<T>;

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
    }: TweenableProps<P>): React.ReactElement | null => {
      type TP = ConfigProps<P>;
      const [count, refresh] = useForceRefresh();
      const ref = useRef<any>(null);
      const targetRef = useRef<Target>(null!);
      const prevPropsRef = useRef<P | null>(null);
      const nextPropsRef = useRef<P | null>(null);

      const prevTarget: Target | null = targetRef.current;
      const target: Target = { tweens: [] };

      const attrs = {} as TP;
      const eventHandlers = {} as TP;
      Object.keys(props).forEach((k: keyof TP) => {
        const v = (props as TP)[k];
        if (isEventHandlerName(k as string)) {
          eventHandlers[k] = v;
        } else {
          attrs[k] = v;
        }
      });

      const deps = Object.values(attrs);

      let fromProps = eventHandlers as P;
      const toProps = { ...eventHandlers } as P;

      if (!nextPropsRef.current) {
        assignProps(
          attrs,
          fromProps,
          toProps,
          prevTarget,
          target,
          prevPropsRef.current
        );
      } else {
        fromProps = nextPropsRef.current;
      }

      (fromProps as any).ref = ref;

      useLayoutEffect(() => {
        let aborted = false;
        if (target.tweens.length) {
          onTweenStart?.();

          const tween = (target.lastTween = startTween(
            ref.current,
            target.tweens,
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
              nextPropsRef.current = toProps;
              refresh();
            } catch (e) {
              // NOP
            }
          })();
        } else {
          if (nextPropsRef.current) {
            nextPropsRef.current = null;
            onTweenEnd?.();
          }
        }
        return () => {
          aborted = true;
        };
      }, [count, ...deps]);

      useEffect(() => {
        targetRef.current = target;
        prevPropsRef.current = fromProps;
      });

      return createElement(element, fromProps, children);
    }
  );
};

export const tween = new Proxy(createComponent, {
  get(target, prop: keyof JSX.IntrinsicElements) {
    if (cache.has(prop)) {
      return cache.get(prop);
    }
    const component = createComponent(prop);
    cache.set(prop, component);
    return component;
  },
}) as typeof createComponent & {
  [K in keyof JSX.IntrinsicElements]: TweenableComponent<
    React.ComponentProps<K>
  >;
};
