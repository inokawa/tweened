import {
  interpolateNumber,
  interpolateRgb,
  interpolateString,
} from "d3-interpolate";
import { color } from "d3-color";
import * as d3Ease from "d3-ease";

export const defaultEase = d3Ease.easeCubicInOut;

export const getInterpolator = (a: any, b: any): ((arg: number) => any) => {
  let c;
  return (
    typeof b === "number"
      ? interpolateNumber
      : b instanceof color
      ? interpolateRgb
      : (c = color(b))
      ? ((b = c), interpolateRgb)
      : interpolateString
  )(a, b);
};

export type Ease =
  | "easeLinear"
  | "easeQuad"
  | "easeQuadIn"
  | "easeQuadOut"
  | "easeQuadInOut"
  | "easeCubic"
  | "easeCubicIn"
  | "easeCubicOut"
  | "easeCubicInOut"
  | "easeSin"
  | "easeSinIn"
  | "easeSinOut"
  | "easeSinInOut"
  | "easeExp"
  | "easeExpIn"
  | "easeExpOut"
  | "easeExpInOut"
  | "easeCircle"
  | "easeCircleIn"
  | "easeCircleOut"
  | "easeCircleInOut"
  | "easeBounce"
  | "easeBounceIn"
  | "easeBounceOut"
  | "easeBounceInOut"
  | "easePoly"
  | "easePolyIn"
  | "easePolyOut"
  | "easePolyInOut"
  | "easeBack"
  | "easeBackIn"
  | "easeBackOut"
  | "easeBackInOut"
  | "easeElastic"
  | "easeElasticIn"
  | "easeElasticOut"
  | "easeElasticInOut";

export const getEase = (ease: Ease) => d3Ease[ease];
