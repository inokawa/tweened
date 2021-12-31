import React, {
  useRef,
  createRef,
  memo,
  isValidElement,
  Children,
  useLayoutEffect,
  createElement,
} from "react";
import { TweenableProp, TweenValue } from "./backends/types";
import { TweenOpts, startTween } from "./backends/js";
import { useForceRefresh } from "./hooks";

export type TweenRender<P extends object> = (props: P) => React.ReactElement;

type Target = {
  ref: React.RefObject<any>;
  tweens: TweenValue[];
};

const makeNodeRenderable = (
  n: React.ReactElement,
  targets: React.MutableRefObject<Target[]>,
  prevNode: React.ReactElement | null
): React.ReactElement => {
  const nodeTweens: TweenValue[] = [];
  const children: React.ReactNode[] = [];
  const fromProps = { ...n.props } as { [key: string]: any };
  if (n.key != null) {
    fromProps.key = n.key;
  }
  if (typeof n.type === "string") {
    Object.keys(n.props).forEach((k) => {
      const p = n.props[k];
      if (k === "children") {
        const prevChildren = Children.toArray(
          prevNode?.props.children ?? []
        ) as React.ReactElement[];
        Children.forEach(p as React.ReactNode, (n, i) => {
          if (isValidElement(n)) {
            if (typeof n.type === "string") {
              children.push(makeNodeRenderable(n, targets, prevChildren[i]));
              return;
            }
          }
          children.push(n);
        });
        return;
      } else if (k === "style") {
        Object.keys(p).forEach((sk) => {
          const sp = p[sk];
          if (sp instanceof TweenableProp) {
            nodeTweens.push({ type: "style", k: sk, p: sp });
            fromProps[k][sk] = prevNode?.props[k]?.[sk] ?? sp.to;
          }
        });
        return;
      }
      if (p instanceof TweenableProp) {
        nodeTweens.push({ type: "attr", k, p });
        fromProps[k] = prevNode?.props[k] ?? p.to;
      }
    });
  }

  if (nodeTweens.length !== 0) {
    const ref = createRef();
    fromProps.ref = ref;
    targets.current.push({ ref, tweens: nodeTweens });
  }
  return createElement(
    n.type,
    fromProps,
    children.length === 0
      ? undefined
      : children.length === 1
      ? children[0]
      : children
  );
};

export type TweenedProps<P extends object> = {
  [key in keyof P]: P[key] extends string | number
    ? P[key] | [P[key]] | [P[key], P[key]]
    : P[key];
} & {
  trans?: "enter" | "update" | "exit";
  onTweenStart?: () => void;
  onTweenEnd?: () => void;
} & TweenOpts;

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
      const targets = useRef<Target[]>(null!);
      const prevNode = useRef<React.ReactElement | null>(null);
      const nextTarget = useRef<React.ReactElement | null>(null);

      targets.current = [];

      const proxiedProps = {} as P;
      const afterProps = {} as P;
      if (!nextTarget.current) {
        Object.keys(props).forEach((k) => {
          const v = props[k as keyof typeof props];
          if (
            k !== "children" &&
            Array.isArray(v) &&
            v.length &&
            v.every((a) => typeof a === "number" || typeof a === "string")
          ) {
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
          renderableNode = makeNodeRenderable(node, targets, prevNode.current);
        } else {
          renderableNode = nextTarget.current;
        }
      } catch (e) {
        throw e;
      }

      useLayoutEffect(() => {
        if (targets.current.length) {
          onTweenStart?.();

          const queues = targets.current.map(({ ref, tweens: tw }) => {
            return startTween(ref.current, tw, {
              duration: duration ?? opts.duration,
              ease: ease ?? opts.ease,
              delay: delay ?? opts.delay,
            });
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

          return () => {
            queues.forEach((t) => t.interrupt());
          };
        } else {
          if (nextTarget.current) {
            nextTarget.current = null;
            onTweenEnd?.();
          }
        }
      });

      prevNode.current = renderableNode;

      return renderableNode;
    }
  );
};
