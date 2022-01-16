import React, { useCallback, useMemo, useState } from "react";
import { tween } from "../src";

const randomHex = () => `#${Math.random().toString(16).slice(-6)}`;

const ColoredDiv = ({
  color,
  bgColor,
  children,
  duration,
  onTweenEnd,
}: {
  color?: string;
  bgColor: string;
  children?: React.ReactNode;
  duration?: number;
  onTweenEnd: () => void;
}) => {
  return (
    <tween.div
      style={useMemo(
        () => ({
          color: [color],
          backgroundColor: [bgColor],
          border: "solid 1px gray",
          padding: 10,
        }),
        [color, bgColor]
      )}
      duration={duration}
      onTweenEnd={onTweenEnd}
    >
      {children}
    </tween.div>
  );
};

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
      onTweenEnd={() => {
        setColor(randomHex());
        setBgColor((p) => !p);
      }}
    >
      <ColoredDiv
        bgColor={bgColor2 ? "white" : "black"}
        duration={500}
        onTweenEnd={() => {
          setBgColor2((p) => !p);
        }}
      >
        {"Lorem"} {"ipsum"}
      </ColoredDiv>
      <ColoredDiv
        bgColor={bgColor3 ? "white" : "black"}
        duration={1000}
        onTweenEnd={() => {
          setBgColor3((p) => !p);
        }}
      >
        Lorem ipsum
      </ColoredDiv>
    </ColoredDiv>
  );
};

export default { title: "Nested" };
