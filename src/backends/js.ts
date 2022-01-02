import { camelToKebab } from "../utils";
import { Ease, getEase } from "./d3";
import { Engine, TweenQueue } from "./engine";
import { toKey, Tween, TweenTarget } from "./types";

const engine = new Engine<HTMLElement>();

export type TweenOpts = {
  ease?: Ease;
  duration?: number;
  delay?: number;
};

export const startTween = (
  el: HTMLElement,
  values: TweenTarget[],
  opts: TweenOpts
): Tween => {
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

  const tweens: TweenQueue[] = [];
  const promises: Promise<void>[] = [];
  values.forEach((tw) => {
    if (tw.type === "attr") {
      const name = camelToKebab(tw.key);
      const tween = engine.startTween(
        el,
        toKey(tw.type, tw.key),
        tw.value,
        (k, v) => el.setAttribute(name, String(v)),
        timing
      );
      tweens.push(tween);
      promises.push(
        new Promise((resolve, reject) => {
          if (!tween) return resolve();
          tween.callbacks.end.push(resolve);
          tween.callbacks.interrupt.push(reject);
          tween.callbacks.cancel.push(reject);
        })
      );
    } else if (tw.type === "style") {
      const name = camelToKebab(tw.key);
      const tween = engine.startTween(
        el,
        toKey(tw.type, tw.key),
        tw.value,
        (k, v) =>
          el.style.setProperty(name, typeof v === "number" ? `${v}px` : v),
        timing
      );
      tweens.push(tween);
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
    get: () => {
      return tweens.map((t) => t.get());
    },
    end: async () => {
      await Promise.all(promises);
    },
    interrupt: () => {},
  };
};
