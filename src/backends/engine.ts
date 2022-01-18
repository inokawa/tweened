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
  readonly name: string;
  readonly tm: Timing;
  readonly cb: Callbacks;
  status: Status;
  timer: Timer;
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
    name,
    tm: timing,
    cb,
    status: CREATED,
    timer: null!,
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

    tween.timer = timer(
      (elapsed) => {
        tween.status = SCHEDULED;
        tween.timer.restart(start, tween.tm.delay, tween.tm.time);

        if (tween.tm.delay <= elapsed) start(elapsed - tween.tm.delay);
      },
      0,
      tween.tm.time
    );

    const start = (elapsed: number) => {
      if (tween.status !== SCHEDULED) return stop(tween, id);

      for (const tid in tweens) {
        const t = tweens[tid]!;
        if (t.name !== tween.name) {
          continue;
        }

        if (t.status === STARTED) {
          return timeout(start);
        }

        if (t.status === RUNNING) {
          t.cb.interrupt.forEach((fn) => fn());
          stop(t, +tid);
        } else if (+tid < id) {
          t.cb.cancel.forEach((fn) => fn());
          stop(t, +tid);
        }
      }

      timeout(() => {
        if (tween.status === STARTED) {
          tween.status = RUNNING;
          tween.timer.restart(tick, tween.tm.delay, tween.tm.time);
          tick(elapsed);
        }
      });

      tween.status = STARTING;
      tween.cb.start.forEach((fn) => fn());

      if (tween.status !== STARTING) {
        return;
      }
      tween.status = STARTED;

      tween.init();
    };

    const tick = (elapsed: number) => {
      let t = 1;
      if (elapsed < tween.tm.duration) {
        t = tween.tm.ease(elapsed / tween.tm.duration);
      } else {
        tween.timer.restart(() => stop(tween, id));
        tween.status = ENDING;
      }

      tween.update(t);

      if (tween.status === ENDING) {
        tween.cb.end.forEach((fn) => fn());
        stop(tween, id);
      }
    };

    const stop = (t: TweenQueue, id: number) => {
      t.status = ENDED;
      t.timer.stop();
      delete tweens[id];
      for (const _ in tweens) return;
      this.#targets.delete(target);
    };

    return tween;
  }
}
