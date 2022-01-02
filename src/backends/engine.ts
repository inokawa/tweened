import { now, timer, timeout, type Timer } from "d3-timer";
import { getInterpolator, defaultEase } from "./d3";
import { Value } from "./types";
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
  start: (() => void)[];
  cancel: (() => void)[];
  interrupt: (() => void)[];
  end: (() => void)[];
};

export type TweenQueue = {
  readonly name: string;
  readonly timing: Timing;
  readonly callbacks: Callbacks;
  status: Status;
  timer: Timer;
  init: () => void;
  update: (t: number) => void;
  get: () => Value;
};

type Timing = {
  readonly time: number;
  readonly delay: number;
  readonly duration: number;
  readonly ease: (i: number) => number;
};

type Setter = (k: string, value: Value) => void;

const createQueue = (
  name: string,
  timing: Timing,
  callbacks: Callbacks,
  [endValue, startValue]: [Value, Value],
  setter: Setter
): TweenQueue => {
  let value: Value = startValue;
  let updater: (t: number) => void = NOP;

  return {
    name,
    timing,
    callbacks,
    status: CREATED,
    timer: null!,
    init: () => {
      if (startValue === endValue) {
        return;
      }

      const i = getInterpolator(startValue, endValue);
      updater = (t: number) => {
        const v = i(t);
        value = v;
        setter(name, v);
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

const timingDefaults = {
  delay: 0,
  duration: 250,
  ease: defaultEase,
};

type Schedules = {
  [key: string]: TweenQueue;
};

export class Engine<T extends object = never> {
  #targets: WeakMap<T, Schedules>;

  constructor() {
    this.#targets = new WeakMap();
  }

  startTween(
    target: T,
    name: string,
    value: [Value, Value],
    setter: Setter,
    {
      timing = {},
      callbacks = { start: [], cancel: [], end: [], interrupt: [] },
    }: {
      timing?: Partial<Timing>;
      callbacks?: Callbacks;
    } = {}
  ): TweenQueue {
    return this.#update(
      target,
      name,
      {
        ...timingDefaults,
        ...timing,
        time: now(),
      },
      value,
      callbacks,
      setter
    );
  }

  #update(
    target: T,
    name: string,
    timing: Timing,
    value: [Value, Value],
    callbacks: Callbacks,
    setter: Setter
  ) {
    if (!this.#targets.has(target)) {
      this.#targets.set(target, {});
    }
    const tweens = this.#targets.get(target)!;

    const id = generateId();
    const tween = (tweens[id] = createQueue(
      name,
      timing,
      callbacks,
      value,
      setter
    ));

    tween.timer = timer(
      (elapsed) => {
        tween.status = SCHEDULED;
        tween.timer.restart(start, tween.timing.delay, tween.timing.time);

        if (tween.timing.delay <= elapsed) start(elapsed - tween.timing.delay);
      },
      0,
      tween.timing.time
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
          t.callbacks.interrupt.forEach((fn) => fn());
          stop(t, +tid);
        } else if (+tid < id) {
          t.callbacks.cancel.forEach((fn) => fn());
          stop(t, +tid);
        }
      }

      timeout(() => {
        if (tween.status === STARTED) {
          tween.status = RUNNING;
          tween.timer.restart(tick, tween.timing.delay, tween.timing.time);
          tick(elapsed);
        }
      });

      tween.status = STARTING;
      tween.callbacks.start.forEach((fn) => fn());

      if (tween.status !== STARTING) {
        return;
      }
      tween.status = STARTED;

      tween.init();
    };

    const tick = (elapsed: number) => {
      let t = 1;
      if (elapsed < tween.timing.duration) {
        t = tween.timing.ease(elapsed / tween.timing.duration);
      } else {
        tween.timer.restart(() => stop(tween, id));
        tween.status = ENDING;
      }

      tween.update(t);

      if (tween.status === ENDING) {
        tween.callbacks.end.forEach((fn) => fn());
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
