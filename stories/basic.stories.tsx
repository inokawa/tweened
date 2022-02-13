import React, { useState } from "react";
import { tween as t } from "../src";

export const Basic = () => {
  const [completed, setCompleted] = useState(false);
  return (
    <svg width={600} height={400} viewBox="0 0 600 400">
      <t.g
        duration={800}
        fill={[completed ? "green" : "red"]}
        transform={[`translate(${completed ? 200 : 50}, 50)`]}
        onTweenEnd={() => {
          setCompleted((prev) => !prev);
        }}
      >
        <t.rect y={4} width={[completed ? 200 : 20]} height={2} />
        <text fontSize={24}>Hello world</text>
      </t.g>
    </svg>
  );
};

export default { title: "Basic" };
