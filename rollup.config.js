const { defineConfig } = require("rollup");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const typescript = require("@rollup/plugin-typescript");

module.exports = () =>
  defineConfig({
    input: "src/ose.ts",
    output: {
      dir: "dist/module/",
      format: "es",
      sourcemap: true,
    },
    plugins: [nodeResolve(), typescript()],
  });
