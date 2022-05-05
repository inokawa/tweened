import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    {
      file: pkg.module,
      format: "es",
    },
  ],
  external: Object.keys(pkg.dependencies),
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      outDir: ".",
      declaration: true,
      exclude: ["src/**/*.spec.*"],
    }),
    terser({ compress: { passes: 3 } }),
  ],
};
