import * as d3 from "d3";
import { camelToKebab } from "../utils";
import { Ease, getEase, getInterpolator } from "./d3";
import { TweenObject, TweenTarget } from "./types";


export type TweenOpts = {
  ease?: Ease;
  duration?: number;
  delay?: number;
};

export const startTween = (
  el: HTMLElement,
  tweens: TweenTarget[],
  opts: TweenOpts
): TweenObject => {
  const s = d3.select(el);
  const t = s.transition(d3.transition() as any);
  if (opts.duration != null) {
    t.duration(opts.duration);
  }
  if (opts.ease != null) {
    t.ease(getEase(opts.ease));
  }
  if (opts.delay != null) {
    t.delay(opts.delay);
  }

  tweens.forEach((tw) => {
    if (tw.type === "attr") {
      t.tween(`attr.${tw.k}`, function () {
        const name = camelToKebab(tw.k);
        const i = getInterpolator(
          tw.p.from ?? this.getAttribute(name),
          tw.p.to
        );
        return function (t) {
          this.setAttribute(name, i(t));
        };
      });
    } else if (tw.type === "style") {
      t.tween(`style.${tw.k}`, function () {
        const name = camelToKebab(tw.k);
        const i = getInterpolator(
          tw.p.from ?? this.style.getPropertyValue(name),
          tw.p.to
        );
        return function (t) {
          this.style.setProperty(name, i(t));
        };
      });
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
