import { now, timer, timeout, type Timer } from "d3-timer";
import { easeCubicInOut } from "d3-ease";
import { getInterpolator } from "./d3";
import { Value } from "./types";

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

type TweenValue = [endValue: Value, startValue?: Value];
type TweenQueue = {
  readonly name: string;
  readonly timing: Timing;
  readonly callbacks: Callbacks;
  status: Status;
  timer: Timer;
  init: () => void;
  update: (t: number) => void;
};

type Timing = {
  readonly time: number;
  readonly delay: number;
  readonly duration: number;
  readonly ease: (i: number) => number;
};

type Getter = (k: string) => Value;
type Setter = (k: string, value: Value) => void;

const createQueue = (
  name: string,
  timing: Timing,
  callbacks: Callbacks,
  values: TweenValue[],
  getter: Getter,
  setter: Setter
): TweenQueue => {
  values.forEach(([, startValue]) => {
    if (startValue != null) {
      setter(name, startValue);
    }
  });

  const updaters: { value: string | number; update: (t: number) => void }[] =
    [];

  return {
    name,
    timing,
    callbacks,
    status: CREATED,
    timer: null!,
    init: () => {
      values.forEach(([endValue]) => {
        const startValue = getter(name);
        if (startValue === endValue) {
          return null;
        }

        const i = getInterpolator(startValue, endValue);
        const updater = {
          value: startValue,
          update: (t: number) => {
            const v = i(t);
            updater.value = v;
            setter(name, v);
          },
        };
        updaters.push(updater);
      });
    },
    update: (t: number) => {
      updaters.forEach((u) => u.update(t));
    },
  };
};

const timingDefaults = {
  delay: 0,
  duration: 250,
  ease: easeCubicInOut,
};

type Schedules = {
  [key: string]: TweenQueue;
};

export class Engine<T extends object = never> {
  #targets: WeakMap<T, Schedules>;

  constructor() {
    this.#targets = new WeakMap();
  }

  getTween(target: T, name: string): TweenQueue | null {
    const tweens = this.#targets.get(target);
    for (const tid in tweens) {
      const t = tweens[tid]!;
      if (t.name !== name) {
        continue;
      }
      return t;
    }
    return null;
  }

  startTween<V extends Value>(
    target: T,
    name: string,
    next: V | [V] | [V, V],
    getter: Getter,
    setter: Setter,
    {
      timing = {},
      callbacks = { start: [], cancel: [], end: [], interrupt: [] },
    }: {
      timing?: Partial<Timing>;
      callbacks?: Callbacks;
    } = {}
  ): TweenQueue {
    const values: TweenValue[] = [];

    if (Array.isArray(next)) {
      if (next.length === 1) {
        values.push([next[0]]);
      } else {
        values.push([next[1], next[0]]);
      }
    } else {
      values.push([next, next]);
    }

    return this.#update(
      target,
      name,
      {
        ...timingDefaults,
        ...timing,
        time: now(),
      },
      values,
      callbacks,
      getter,
      setter
    );
  }

  #update(
    target: T,
    name: string,
    timing: Timing,
    values: TweenValue[],
    callbacks: Callbacks,
    getter: Getter,
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
      values,
      getter,
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
      if (tween.status !== SCHEDULED) return stop();

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
          stop();
        } else if (+tid < id) {
          t.callbacks.cancel.forEach((fn) => fn());
          stop();
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
        tween.timer.restart(stop);
        tween.status = ENDING;
      }

      tween.update(t);

      if (tween.status === ENDING) {
        tween.callbacks.end.forEach((fn) => fn());
        stop();
      }
    };

    const stop = () => {
      tween.status = ENDED;
      tween.timer.stop();
      delete tweens[id];
      for (const _ in tweens) return;
      this.#targets.delete(target);
    };

    return tween;
  }
}
