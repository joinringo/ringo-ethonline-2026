import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptConfig from "eslint-config-next/typescript";

/**
 * Flat config, using the entrypoints eslint-config-next ships directly.
 *
 * `subgraph/` is ignored on purpose: its .ts files are AssemblyScript, which
 * shares the extension but not the language. Linting them with a TypeScript
 * parser produces noise about syntax that is correct where it lives.
 */
const config = [
  ...coreWebVitals,
  ...typescriptConfig,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "subgraph/**",
      "worldid-gate/**",
    ],
  },
];

export default config;
