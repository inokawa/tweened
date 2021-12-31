import { camelToKebab } from "../utils";
import { Ease, getEase } from "./d3";
import { Engine } from "./engine";
import { TweenObject, TweenTarget } from "./types";

const engine = new Engine<HTMLElement>();

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
  const timing: {
    duration?: number;
    ease?: (t: number) => number;
    delay?: number;
  } = {};
  if (opts.duration != null) {
    timing.duration = opts.duration;
  }
  if (opts.ease != null) {
    timing.ease = getEase(opts.ease);
  }
  if (opts.delay != null) {
    timing.delay = opts.delay;
  }

  const promises: Promise<void>[] = [];
  tweens.forEach((tw) => {
    if (tw.type === "attr") {
      const name = camelToKebab(tw.k);
      const tween = engine.startTween(
        el,
        `attr.${tw.k}`,
        [tw.p.from ?? (el.getAttribute(name) as string), tw.p.to],
        (k) => el.getAttribute(name) as string,
        (k, v) => el.setAttribute(name, v as string),
        {
          timing,
        }
      );
      promises.push(
        new Promise((resolve, reject) => {
          if (!tween) return resolve();
          tween.callbacks.end.push(resolve);
          tween.callbacks.interrupt.push(reject);
          tween.callbacks.cancel.push(reject);
        })
      );
    } else if (tw.type === "style") {
      const name = camelToKebab(tw.k);
      const tween = engine.startTween(
        el,
        `style.${tw.k}`,
        [tw.p.from ?? el.style.getPropertyValue(name), tw.p.to],
        (k) => el.style.getPropertyValue(name),
        (k, v) => el.style.setProperty(name, v as string),
        {
          timing,
        }
      );
      promises.push(
        new Promise((resolve, reject) => {
          if (!tween) return resolve();
          tween.callbacks.end.push(resolve);
          tween.callbacks.interrupt.push(reject);
          tween.callbacks.cancel.push(reject);
        })
      );
    }
  });

  return {
    end: async () => {
      await Promise.all(promises);
    },
    interrupt: () => {},
  };
};
