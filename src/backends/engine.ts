import { now, timer, timeout, type Timer } from "d3-timer";
import { getInterpolator, defaultEase } from "./d3";
import { TweenValue, Value } from "./types";
import { NOP } from "../utils";

const CREATED = 0;
const SCHEDULED = 1;
const STARTING = 2;
const STARTED = 3;
const RUNNING = 4;
const ENDING = 5;
const ENDED = 6;

type Status =
  | typeof CREATED
  | typeof SCHEDULED
  | typeof STARTING
  | typeof STARTED
  | typeof RUNNING
  | typeof ENDING
  | typeof ENDED;

let id = 0;

const generateId = (): number => ++id;

export type Callbacks = {
  readonly start: (() => void)[];
  readonly cancel: (() => void)[];
  readonly interrupt: (() => void)[];
  readonly end: (() => void)[];
};

export type TweenQueue = {
  readonly nm: string;
  readonly pr: Timing;
  readonly cb: Callbacks;
  st: Status;
  tm: Timer;
  readonly init: () => void;
  readonly update: (t: number) => void;
  readonly get: () => Value;
};

type Timing = {
  readonly time: number;
  readonly delay: number;
  readonly duration: number;
  readonly ease: (i: number) => number;
};

export type Setter = (k: string, value: Value) => void;

const DEFAULT_DELAY = 0;
const DEFAULT_DURATION = 250;
const DEFAULT_EASE = defaultEase;

const createQueue = (
  name: string,
  timing: Timing,
  cb: Callbacks,
  [endValue, startValue]: TweenValue,
  setter: Setter
): TweenQueue => {
  let value: Value = startValue;
  let updater: (t: number) => void = NOP;

  return {
    nm: name,
    pr: timing,
    cb,
    st: CREATED,
    tm: null!,
    init: () => {
      if (startValue === endValue) return;

      const i = getInterpolator(startValue, endValue);
      updater = (t) => {
        value = i(t);
        setter(name, value);
      };
    },
    update: (t: number) => {
      updater(t);
    },
    get: () => {
      return value;
    },
  };
};

type Schedules = {
  [key: string]: TweenQueue;
};

export class TweenEngine<T extends object = never> {
  #targets: WeakMap<T, Schedules>;

  constructor() {
    this.#targets = new WeakMap();
  }

  start(
    target: T,
    name: string,
    value: TweenValue,
    setter: Setter,
    timing: Partial<Timing>,
    cb: Callbacks = { start: [], cancel: [], end: [], interrupt: [] }
  ): TweenQueue {
    return this.#update(
      target,
      name,
      {
        delay: DEFAULT_DELAY,
        duration: DEFAULT_DURATION,
        ease: DEFAULT_EASE,
        ...timing,
        time: now(),
      },
      value,
      cb,
      setter
    );
  }

  #update(
    target: T,
    name: string,
    timing: Timing,
    value: TweenValue,
    cb: Callbacks,
    setter: Setter
  ) {
    if (!this.#targets.has(target)) {
      this.#targets.set(target, {});
    }
    const tweens = this.#targets.get(target)!;

    const id = generateId();
    const tween = (tweens[id] = createQueue(name, timing, cb, value, setter));

    tween.tm = timer(
      (elapsed) => {
        tween.st = SCHEDULED;
        tween.tm.restart(start, tween.pr.delay, tween.pr.time);

        if (tween.pr.delay <= elapsed) start(elapsed - tween.pr.delay);
      },
      0,
      tween.pr.time
    );

    const start = (elapsed: number) => {
      if (tween.st !== SCHEDULED) return stop(tween, id);

      for (const tid in tweens) {
        const t = tweens[tid]!;
        if (t.nm !== tween.nm) {
          continue;
        }

        if (t.st === STARTED) {
          return timeout(start);
        }

        if (t.st === RUNNING) {
          t.cb.interrupt.forEach((fn) => fn());
          stop(t, +tid);
        } else if (+tid < id) {
          t.cb.cancel.forEach((fn) => fn());
          stop(t, +tid);
        }
      }

      timeout(() => {
        if (tween.st === STARTED) {
          tween.st = RUNNING;
          tween.tm.restart(tick, tween.pr.delay, tween.pr.time);
          tick(elapsed);
        }
      });

      tween.st = STARTING;
      tween.cb.start.forEach((fn) => fn());

      if (tween.st !== STARTING) {
        return;
      }
      tween.st = STARTED;

      tween.init();
    };

    const tick = (elapsed: number) => {
      let t = 1;
      if (elapsed < tween.pr.duration) {
        t = tween.pr.ease(elapsed / tween.pr.duration);
      } else {
        tween.tm.restart(() => stop(tween, id));
        tween.st = ENDING;
      }

      tween.update(t);

      if (tween.st === ENDING) {
        tween.cb.end.forEach((fn) => fn());
        stop(tween, id);
      }
    };

    const stop = (t: TweenQueue, id: number) => {
      t.st = ENDED;
      t.tm.stop();
      delete tweens[id];
      for (const _ in tweens) return;
      this.#targets.delete(target);
    };

    return tween;
  }
}
