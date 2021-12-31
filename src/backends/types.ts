export type Value = string | number;

export class TweenableProp {
  to: Value;
  from: Value | null;

  constructor(to: Value, from: Value | null) {
    this.to = to;
    this.from = from;
  }

  valueOf() {
    return this.to;
  }
}

export type TweenValue = {
  type: "attr" | "style";
  k: string;
  p: TweenableProp;
};

export const toKey = (type: string, key: string) => `${type} ${key}`;

export type TweenObject = {
  get: () => Value[];
  end: () => Promise<void>;
  interrupt: () => void;
};
