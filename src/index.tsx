import React, {
  useRef,
  createRef,
  memo,
  cloneElement,
  isValidElement,
  Children,
  useLayoutEffect,
} from "react";
import { startTween, TweenableProp, TweenObject } from "./engine";

type Tweener = <T extends any>(v: T, opts?: any) => T;

type TransitionState = "update" | "enter" | "exit";

type TweenContext = {
  state: TransitionState;
  tween: Tweener;
};

type TweenRender<P extends object> = (
  props: P,
  ctx: TweenContext
) => React.ReactElement;

type TweenOpts = {};

const register = <T extends unknown>(prop: T): T => {
  return new TweenableProp(prop) as any;
};

export const tweened = <P extends object>(
  render: TweenRender<P>,
  opts?: TweenOpts
) => {
  return memo((props: P) => {
    const refs = useRef<React.RefObject<any>[]>([]);
    const tweens = useRef<{ k: string; p: TweenableProp }[][]>(null!);
    const prevNode = useRef<React.ReactElement | null>(null);

    const node = render(props, { state: "update", tween: register });

    let refIndex = 0;
    tweens.current = [];

    const makeNodeRenderable = (n: React.ReactElement): React.ReactElement => {
      const nodeTweens: { k: string; p: TweenableProp }[] = [];
      const children: React.ReactNode[] = [];
      const tweenProps = {} as { [key: string]: any };
      if (typeof n.type === "string") {
        Object.keys(n.props).forEach((k) => {
          const p = n.props[k];
          if (k === "children") {
            Children.forEach(p as React.ReactNode, (n) => {
              if (isValidElement(n)) {
                children.push(makeNodeRenderable(n));
                return;
              }
              children.push(n);
            });
            return;
          } else if (k === "style") {
            Object.keys(p[k]).forEach((sk) => {
              const sp = p[k][sk];
              if (sp instanceof TweenableProp) {
                sp.type = "style";
                nodeTweens.push({ k: sk, p: sp });
                const prevProp = prevNode.current?.props[k]?.[sk];
                if (prevProp != null) {
                  tweenProps[k][sk] = prevProp;
                } else {
                  tweenProps[k][sk] = sp.prop;
                }
              }
            });
            return;
          }
          if (p instanceof TweenableProp) {
            p.type = "attr";
            nodeTweens.push({ k, p });
            const prevProp = prevNode.current?.props[k];
            if (prevProp != null) {
              tweenProps[k] = prevProp;
            } else {
              tweenProps[k] = p.prop;
            }
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

      tweens.current.push(nodeTweens);
      tweenProps.ref =
        refs.current[refIndex] || (refs.current[refIndex] = createRef());
      refIndex++;
      return cloneElement(
        n,
        tweenProps,
        children.length === 0 ? undefined : children
      );
    };

    const renderableNode = makeNodeRenderable(node);

    useLayoutEffect(() => {
      const queues: TweenObject[] = [];
      refs.current.forEach((ref, i) => {
        const t = startTween(ref.current, tweens.current[i]);
        queues.push(t);
      });
      return () => {
        queues.forEach((t) => t.interrupt());
      };
    });

    prevNode.current = renderableNode;

    return renderableNode;
  });
};
