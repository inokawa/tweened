import React, { useState } from "react";
import { tweened } from "../src";
import { useCallback } from "@storybook/addons";

const toTranslate3d = (x: number) => `translate3d(${x}px, 0, 0)`;

const Square = tweened("div")<{ move: boolean }>(({ move }) => ({
  className: "demo0-block",
  style: { transform: [toTranslate3d(move ? 400 : 0)] },
}));

export const Toggle = () => {
  const [move, setMove] = useState(false);
  const onClick = useCallback(() => setMove((p) => !p), []);
  return (
    <div>
      <button onMouseDown={onClick} onTouchStart={onClick}>
        Toggle
      </button>
      <div className="demo0">
        <Square move={move} duration={800} />
      </div>
      <style>
        {`
.demo0 {
  border-radius: 4px;
  background-color: rgb(240, 240, 232);
  position: relative;
  margin: 5px 3px 10px;
  width: 450px;
  height: 50px;
}
.demo0-block {
  position: absolute;
  width: 50px;
  height: 50px;
  border-radius: 4px;
  background-color: rgb(130, 181, 198);
}
`}
      </style>
    </div>
  );
};

export default { title: "Toggle" };
