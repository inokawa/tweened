import React, { useEffect, useRef, useState } from "react";
import { tweened, Transition } from "../src";

const useInterval = (cb: () => void, interval: number) => {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  });
  useEffect(() => {
    let id = (function createTimer() {
      return setTimeout(() => {
        ref.current();
        id = createTimer();
      }, interval);
    })();
    return () => {
      clearTimeout(id);
    };
  }, [interval]);
};

const shuffle = ([...array]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const ALPHABETS = "abcdefghijklmnopqrstuvwxyz".split("");

const Letter = tweened("text")<{
  i: number;
}>(
  (props, { state }) => {
    const baseProps = { y: 0, fillOpacity: 1 };
    if (state === "enter") {
      return {
        ...baseProps,
        className: "enter",
        x: props.i * 20,
        y: [-20, 0],
        fillOpacity: [0, 1],
      };
    } else if (state === "exit") {
      return {
        ...baseProps,
        className: "exit",
        x: [props.i * 20],
        y: [20],
        fillOpacity: [0],
      };
    } else {
      return { ...baseProps, className: "update", x: [props.i * 20] };
    }
  },
  { duration: 750 }
);

export const Alphabet = () => {
  const [datas, setDatas] = useState<string[]>(ALPHABETS);
  useInterval(() => {
    setDatas(
      shuffle(ALPHABETS)
        .slice(0, Math.floor(Math.random() * 26))
        .sort()
    );
  }, 1000);

  return (
    <div>
      <svg width={600} height={400}>
        <g transform={`translate(${25},${50})`}>
          <Transition>
            {datas.map((d, i) => (
              <Letter key={d} i={i}>
                {d}
              </Letter>
            ))}
          </Transition>
        </g>
      </svg>
      <style>
        {`
      text {
        font: bold 28px monospace;
      }
      
      .enter {
        fill: green;
      }
      
      .update {
        fill: #333;
      }
      
      .exit {
        fill: brown;
      }
      `}
      </style>
    </div>
  );
};

export default { title: "Alphabet" };
