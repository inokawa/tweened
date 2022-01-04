import React, { useCallback, useState } from "react";
import { tweened } from "../src";

const randomHex = () => `#${Math.random().toString(16).slice(-6)}`;

const ColoredDiv = tweened("div")<{
  color?: string;
  bgColor: string;
}>((props) => ({
  style: {
    color: [props.color],
    backgroundColor: [props.bgColor],
    border:'solid 1px gray',
    padding: 10,
  },
}));

export const Nested = () => {
  const [color, setColor] = useState(randomHex);
  const [bgColor, setBgColor] = useState(true);
  const [bgColor2, setBgColor2] = useState(true);
  const [bgColor3, setBgColor3] = useState(true);
  return (
    <ColoredDiv
      color={color}
      bgColor={bgColor ? "white" : "black"}
      duration={800}
      onTweenEnd={useCallback(() => {
        setColor(randomHex());
        setBgColor((p) => !p);
      }, [])}
    >
      <ColoredDiv
        bgColor={bgColor2 ? "white" : "black"}
        duration={500}
        onTweenEnd={useCallback(() => {
          setBgColor2((p) => !p);
        }, [])}
      >
        {"Lorem"} {"ipsum"}
      </ColoredDiv>
      <ColoredDiv
        bgColor={bgColor3 ? "white" : "black"}
        duration={1000}
        onTweenEnd={useCallback(() => {
          setBgColor3((p) => !p);
        }, [])}
      >
        Lorem ipsum
      </ColoredDiv>
    </ColoredDiv>
  );
};

export default { title: "Nested" };
