# tweened

![npm](https://img.shields.io/npm/v/tweened) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/tweened) [![check](https://github.com/inokawa/tweened/actions/workflows/check.yml/badge.svg)](https://github.com/inokawa/tweened/actions/workflows/check.yml) [![demo](https://github.com/inokawa/tweened/actions/workflows/demo.yml/badge.svg)](https://github.com/inokawa/tweened/actions/workflows/demo.yml)

A simple, declarative and composable animation library for [React](https://github.com/facebook/react).

**This is under development and APIs are not stable.**

<img src="./hello.gif" width="600px" />

## Demo

https://inokawa.github.io/tweened/

## Motivation

Animating something in React usually becomes complicated than we expected... This library is an experiment to find out the proper way for React to define how to animate.

The core of this library is simple. Pass `[value]` to element if you want to animate the attribute / style and pass `value` if you don't want. It's easy to learn and it wouldn't take time to integrate to / remove from your project.

And also aiming to achieve performant and flexible animation in React, but be lightweight as much as possible.

## Install

```sh
npm install tweened
```

### Requirements

- react >= 16.14

## Usage

```tsx
import { useState } from "react";
import { tween as t } from "tweened";

const App = () => {
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
```

And see [examples](./stories) for more usages.

## TODOs

- [ ] APIs
  - [x] Basic tweening
  - [ ] Enter / Exit transition
  - [ ] Chained animation (keyframes)
  - [ ] Custom interpolator (ex. text tweening)
  - [ ] Cancel / Resume animation
  - [ ] Timeline manipulation (like GSAP)
  - [ ] Orchestrated animation across components
- [ ] Platforms
  - [x] React (JS backend)
  - [ ] React (opt-in Web Animations API backend)
  - [ ] React Native
- [ ] Support concurrent feature of React 18
- [ ] Optimize bundle size
- [ ] Documentation

## Inspirations

- [D3.js](https://github.com/d3/d3)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [resonance](https://github.com/sghall/resonance)
- [react-move](https://github.com/sghall/react-move)
- [react-flight](https://github.com/jondot/react-flight)
- [framer-motion](https://github.com/framer/motion)
- [react-spring](https://github.com/pmndrs/react-spring)
- [d3-render](https://github.com/unkleho/d3-render)
- [styled-components](https://github.com/styled-components)
- [react-router](https://github.com/remix-run/react-router)
