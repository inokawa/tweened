import React, { useState, useCallback } from "react";
import { tweened } from "../src";

const TweenedDiv = tweened("div")<{ isWidth: boolean }>(({ isWidth }) => {
  const baseStyle = {
    position: "fixed" as const,
    backgroundColor: [isWidth ? "limegreen" : "violet"] as [string],
    [isWidth ? "height" : "width"]: ["100px"],
    cursor: "pointer",
  };
  return [
    {
      style: { ...baseStyle, [isWidth ? "width" : "height"]: ["50px"] },
    },
    {
      style: { ...baseStyle, [isWidth ? "width" : "height"]: ["200px"] },
    },
    {
      style: { ...baseStyle, [isWidth ? "width" : "height"]: ["100px"] },
    },
  ];
});

export const Sequence = () => {
  const [isWidth, setIsWidth] = useState(false);
  const toggle = useCallback(() => setIsWidth((p) => !p), []);
  return (
    <TweenedDiv
      isWidth={isWidth}
      onClick={toggle}
      onTweenEnd={toggle}
      duration={400}
    >
      click me
    </TweenedDiv>
  );
};

export default { title: "Sequence" };
