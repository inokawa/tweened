import React, {
  useRef,
  createRef,
  memo,
  cloneElement,
  isValidElement,
  Children,
  useLayoutEffect,
  useContext,
} from "react";
import {
  TransitionStateContext,
  TransitionState,
  TransitionRemoveContext,
  TransitionKeyContext,
} from "./transition";
import { Ease, startTween, TweenableProp, TweenObject } from "./engine";
import { useForceRefresh } from "./hooks";

type Tweener = <T extends string | number>(...args: [T] | [T, T]) => T;

type TweenContext = {
  state: TransitionState;
  tween: Tweener;
};

export type TweenRender<P extends object> = (
  props: P,
  ctx: TweenContext
) => React.ReactElement;

export type TweenOpts = {
  ease?: Ease;
  duration?: number;
};

export const tweened = <P extends object>(
  render: TweenRender<P>,
  opts: TweenOpts = {}
) => {
  return memo((props: P) => {
    const refresh = useForceRefresh();
    const visible = useRef(true);
    const refs = useRef<React.RefObject<any>[]>([]);
    const tweens = useRef<{ k: string; p: TweenableProp }[][]>(null!);
    const prevNode = useRef<React.ReactElement | null>(null);

    const transitionState = useContext(TransitionStateContext);
    const transitionKey = useContext(TransitionKeyContext);
    const transitionRemove = useContext(TransitionRemoveContext);

    if (transitionState !== "exit") {
      visible.current = true;
    }

    const register = <T extends string | number>(...args: [T] | [T, T]): T => {
      if (args.length === 2) {
        return new TweenableProp(args[1], args[0], transitionState) as any;
      }
      return new TweenableProp(args[0], null, transitionState) as any;
    };

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
                  tweenProps[k][sk] = sp.to;
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
              tweenProps[k] = p.to;
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

    const renderableNode = visible.current
      ? makeNodeRenderable(
          render(props, { state: transitionState, tween: register })
        )
      : null;

    useLayoutEffect(() => {
      if (!visible.current) return;
      const queues: TweenObject[] = [];
      refs.current.forEach((ref, i) => {
        const t = startTween(
          ref.current,
          tweens.current[i],
          opts.duration,
          opts.ease
        );
        queues.push(t);
      });
      if (transitionState === "exit") {
        (async () => {
          try {
            await Promise.all(queues.map((q) => q.end()));
            visible.current = false;
            transitionRemove(transitionKey);
            refresh();
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
  });
};
