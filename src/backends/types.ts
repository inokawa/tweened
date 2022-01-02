export type Value = string | number;

export type TweenValue = [endValue: Value, startValue?: Value];

export type Tween = {
  type: "attr" | "style";
  key: string;
  value: TweenValue;
};

export const toKey = (type: string, key: string) => `${type} ${key}`;

export type TweenObject = {
  get: () => Value[];
  end: () => Promise<void>;
  interrupt: () => void;
};
