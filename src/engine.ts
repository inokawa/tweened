import * as d3 from "d3";
import { TransitionState } from "./transition";
import { camelToKebab } from "./utils";

export class TweenableProp {
  state: TransitionState;
  to: string | number;
  from: string | number | null;

  constructor(
    to: string | number,
    from: string | number | null,
    state: TransitionState
  ) {
    this.state = state;
    this.to = to;
    this.from = from;
  }
}

export type TweenObject = ReturnType<typeof startTween>;

export type Ease =
  | "easeLinear"
  | "easeQuad"
  | "easeQuadIn"
  | "easeQuadOut"
  | "easeQuadInOut"
  | "easeCubic"
  | "easeCubicIn"
  | "easeCubicOut"
  | "easeCubicInOut"
  | "easeSin"
  | "easeSinIn"
  | "easeSinOut"
  | "easeSinInOut"
  | "easeExp"
  | "easeExpIn"
  | "easeExpOut"
  | "easeExpInOut"
  | "easeCircle"
  | "easeCircleIn"
  | "easeCircleOut"
  | "easeCircleInOut"
  | "easeBounce"
  | "easeBounceIn"
  | "easeBounceOut"
  | "easeBounceInOut"
  | "easePoly"
  | "easePolyIn"
  | "easePolyOut"
  | "easePolyInOut"
  | "easeBack"
  | "easeBackIn"
  | "easeBackOut"
  | "easeBackInOut"
  | "easeElastic"
  | "easeElasticIn"
  | "easeElasticOut"
  | "easeElasticInOut";

export type TweenTarget = {
  type: "attr" | "style";
  k: string;
  p: TweenableProp;
};
export const startTween = (
  el: any,
  tweens: TweenTarget[],
  duration?: number,
  ease?: Ease,
  delay?: number
) => {
  const s = d3.select(el);
  const t = s.transition(d3.transition() as any);
  if (duration != null) {
    t.duration(duration);
  }
  if (ease != null) {
    t.ease(d3[ease]);
  }
  if (delay != null) {
    t.delay(delay);
  }

  tweens.forEach((tw) => {
    if (tw.type === "attr") {
      if (tw.p.from != null) {
        s.attr(camelToKebab(tw.k), tw.p.from);
      }
      t.attr(camelToKebab(tw.k), tw.p.to);
    } else if (tw.type === "style") {
      if (tw.p.from != null) {
        s.style(camelToKebab(tw.k), tw.p.from);
      }
      t.style(camelToKebab(tw.k), tw.p.to);
    }
  });

  return {
    end: () => t.end(),
    interrupt: () => {
      s.interrupt();
    },
  };
};
