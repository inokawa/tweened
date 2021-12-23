import React, {
  useRef,
  createRef,
  memo,
  cloneElement,
  isValidElement,
  Children,
  useLayoutEffect,
} from "react";
import {
  Ease,
  startTween,
  TweenableProp,
  TweenObject,
  TweenTarget,
} from "./engine";

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
        Object.keys(p[k]).forEach((sk) => {
          const sp = p[k][sk];
          if (sp instanceof TweenableProp) {
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
      const refs = useRef<React.RefObject<any>[]>(null!);
      const tweens = useRef<TweenTarget[][]>(null!);
      const prevNode = useRef<React.ReactElement | null>(null);

      refs.current = [];
      tweens.current = [];

      const proxiedProps = {} as P;
      Object.keys(props).forEach((k) => {
        const v = props[k as keyof typeof props];
        if (Array.isArray(v)) {
          if (v.length === 1) {
            (proxiedProps as any)[k] = new TweenableProp(v[0], null) as any;
          } else if (v.length == 2) {
            (proxiedProps as any)[k] = new TweenableProp(v[1], v[0]) as any;
          }
        } else {
          (proxiedProps as any)[k] = v;
        }
      });

      let renderableNode: React.ReactElement | null = null;
      try {
        const node = render(proxiedProps as P);
        renderableNode = makeNodeRenderable(node, refs, tweens, prevNode);
      } catch (e) {
        refs.current = [];
        tweens.current = [];
      }

      useLayoutEffect(() => {
        onTweenStart?.();
        const queues: TweenObject[] = [];
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

        if (onTweenEnd) {
          (async () => {
            try {
              await Promise.all(queues.map((q) => q.end()));
              onTweenEnd?.();
            } catch (e) {
              // NOP
            }
          })();
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
