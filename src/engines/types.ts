export class TweenableProp {
  to: string | number;
  from: string | number | null;

  constructor(to: string | number, from: string | number | null) {
    this.to = to;
    this.from = from;
  }
}

export type TweenTarget = {
  type: "attr" | "style";
  k: string;
  p: TweenableProp;
};

export type TweenObject = {
  end: () => Promise<void>;
  interrupt: () => void;
};
