import React, {
  useRef,
  createRef,
  memo,
  cloneElement,
  isValidElement,
  Children,
  useLayoutEffect,
} from "react";
import { TweenableProp, TweenObject, TweenTarget } from "./engines/types";
import { Ease, startTween } from "./engines/js";
import { useForceRefresh } from "./hooks";

export type TweenRender<P extends object> = (props: P) => React.ReactElement;

export type TweenOpts = {
  ease?: Ease;
  duration?: number;
};

const makeNodeRenderable = (
  n: React.ReactElement,
  refs: React.MutableRefObject<React.RefObject<any>[]>,
  tweens: React.MutableRefObject<TweenTarget[][]>,
  prevNode: React.MutableRefObject<React.ReactElement | null>
): React.ReactElement => {
  const nodeTweens: TweenTarget[] = [];
  const children: React.ReactNode[] = [];
  const tweenProps = {} as { [key: string]: any };
  if (typeof n.type === "string") {
    Object.keys(n.props).forEach((k) => {
      const p = n.props[k];
      if (k === "children") {
        Children.forEach(p as React.ReactNode, (n) => {
          if (isValidElement(n)) {
            children.push(makeNodeRenderable(n, refs, tweens, prevNode));
            return;
          }
          children.push(n);
        });
        return;
      } else if (k === "style") {
        Object.keys(p).forEach((sk) => {
          const sp = p[sk];
          if (sp instanceof TweenableProp) {
            if (!tweenProps[k]) {
              tweenProps[k] = {};
            }
            nodeTweens.push({ type: "style", k: sk, p: sp });
            tweenProps[k][sk] = prevNode.current?.props[k]?.[sk] ?? sp.to;
          }
        });
        return;
      }
      if (p instanceof TweenableProp) {
        nodeTweens.push({ type: "attr", k, p });
        tweenProps[k] = prevNode.current?.props[k] ?? p.to;
      }
    });
  }

  if (nodeTweens.length === 0) {
    return cloneElement(
      n,
      undefined,
      children.length === 0 ? undefined : children
    );
  }

  const ref = createRef();
  tweenProps.ref = ref;
  refs.current.push(ref);
  tweens.current.push(nodeTweens);
  return cloneElement(
    n,
    tweenProps,
    children.length === 0 ? undefined : children
  );
};

export type TweenedProps<P extends object> = {
  [key in keyof P]: P[key] extends string | number
    ? P[key] | [P[key]] | [P[key], P[key]]
    : P[key];
} & {
  trans?: "enter" | "update" | "exit";
  ease?: Ease;
  duration?: number;
  delay?: number;
  onTweenStart?: () => void;
  onTweenEnd?: () => void;
};

export const tweened = <P extends object>(
  render: TweenRender<P>,
  opts: TweenOpts = {}
) => {
  return memo(
    ({
      trans,
      ease,
      duration,
      delay,
      onTweenStart,
      onTweenEnd,
      ...props
    }: TweenedProps<P>) => {
      const refresh = useForceRefresh();
      const refs = useRef<React.RefObject<any>[]>(null!);
      const tweens = useRef<TweenTarget[][]>(null!);
      const prevNode = useRef<React.ReactElement | null>(null);
      const nextTarget = useRef<React.ReactElement | null>(null);

      refs.current = [];
      tweens.current = [];

      const proxiedProps = {} as P;
      const afterProps = {} as P;
      if (!nextTarget.current) {
        Object.keys(props).forEach((k) => {
          const v = props[k as keyof typeof props];
          if (Array.isArray(v)) {
            if (v.length === 1) {
              (proxiedProps as any)[k] = new TweenableProp(v[0], null) as any;
              (afterProps as any)[k] = v[0];
            } else if (v.length == 2) {
              (proxiedProps as any)[k] = new TweenableProp(v[1], v[0]) as any;
              (afterProps as any)[k] = v[1];
            }
          } else {
            (proxiedProps as any)[k] = v;
            (afterProps as any)[k] = v;
          }
        });
      }

      let renderableNode: React.ReactElement | null = null;
      try {
        if (!nextTarget.current) {
          const node = render(proxiedProps as P);
          renderableNode = makeNodeRenderable(node, refs, tweens, prevNode);
        } else {
          renderableNode = nextTarget.current;
          nextTarget.current = null;
        }
      } catch (e) {
        refs.current = [];
        tweens.current = [];
      }

      useLayoutEffect(() => {
        const queues: TweenObject[] = [];
        const hasTween = !!tweens.current.length;
        if (hasTween) {
          onTweenStart?.();
          refs.current.forEach((ref, i) => {
            const t = startTween(
              ref.current,
              tweens.current[i],
              duration ?? opts.duration,
              ease ?? opts.ease,
              delay
            );
            queues.push(t);
          });

          (async () => {
            try {
              await Promise.all(queues.map((q) => q.end()));
            } catch (e) {
              // NOP
            } finally {
              nextTarget.current = render(afterProps as P);
              refresh();
            }
          })();
        } else {
          onTweenEnd?.();
        }

        return () => {
          queues.forEach((t) => t.interrupt());
        };
      });

      prevNode.current = renderableNode;

      return renderableNode;
    }
  );
};
