export type Value = string | number;

export type TweenValue = Readonly<[endValue: Value, startValue: Value]>;

export type TweenTarget = Readonly<{
  type: "attr" | "style";
  key: string;
  value: TweenValue;
}>;

export const toKey = (type: string, key: string) => `${type} ${key}`;

export type Tween = Readonly<{
  get: () => Value[];
  end: () => Promise<void>;
}>;
