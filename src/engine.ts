import * as d3 from "d3";
import { camelToKebab } from "./utils";

export class TweenableProp {
  type: "unknown" | "attr" | "style";
  prop: any;

  constructor(prop: any) {
    this.type = "unknown";
    this.prop = prop;
  }
}

export type TweenObject = ReturnType<typeof startTween>;

export const startTween = (
  el: any,
  tweens: { k: string; p: TweenableProp }[]
) => {
  const s = d3.select(el);
  const t = s.transition(d3.transition() as any);

  tweens.forEach((tw) => {
    if (tw.p.type === "attr") {
      t.call(updateAttr, tw.k, tw.p);
    } else if (tw.p.type === "style") {
      t.call(updateStyle, tw.k, tw.p);
    }
  });

  return {
    interrupt: () => {
      s.interrupt();
    },
  };
};

const updateAttr = (
  s: d3.Transition<any, any, any, any>,
  key: string,
  prop: TweenableProp
) => {
  s.attr(camelToKebab(key), prop.prop);
};

const updateStyle = (
  s: d3.Transition<any, any, any, any>,
  key: string,
  prop: TweenableProp
) => {
  s.style(camelToKebab(key), prop.prop);
};
