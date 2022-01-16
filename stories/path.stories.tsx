import React, { useState } from "react";
import { tween } from "../src";
import * as d3 from "d3";

const getRangedData = (max) => {
  const list = [];
  const arr = d3.range(0, Math.ceil(Math.random() * 30));
  for (let i = 0; i < arr.length; i++) {
    list.push({
      name: arr[i] * 10,
      value: Math.floor(Math.random() * Math.random() * max),
    });
  }
  return list;
};

type LineData = { name: number; value: number };

export const Path = () => {
  const [datas, setDatas] = useState<LineData[]>(() => getRangedData(1000));

  const width = 400;
  const height = 300;

  const xScale = d3.scaleLinear().range([0, width]);
  const yScale = d3.scaleLinear().range([height, 0]);
  xScale.domain(d3.extent(datas, (d) => d.name));
  yScale.domain([0, d3.max(datas, (d) => d.value)]);
  const line = d3
    .line<LineData>()
    .x((d) => xScale(d.name))
    .y((d) => yScale(d.value));

  const value = Math.random();

  return (
    <>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <tween.path
          fill="none"
          stroke={[value > 0.85 ? "red" : value > 0.5 ? "violet" : "steelblue"]}
          strokeWidth={[5 * value ** 2 + 2]}
          d={[line(datas)]}
          duration={400}
          ease="easeExp"
          onTweenEnd={() => {
            setDatas(getRangedData(1000));
          }}
        />
      </svg>
    </>
  );
};

export default { title: "Path" };
