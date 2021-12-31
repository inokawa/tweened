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

export type TweenObject = {
  end: () => Promise<void>;
  interrupt: () => void;
};
