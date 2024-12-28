#!/usr/bin/env node

// src/cli.ts
import sade from "sade";
import path3 from "path";
import { existsSync as existsSync3 } from "fs";
import fs3 from "fs/promises";
import { createServer, build } from "vite";
import { VitePluginNode } from "vite-plugin-node";

// src/utils/gql-tada.ts
import { promises as fs, watch, existsSync } from "fs";
import path from "path";
import { buildSchema, introspectionFromSchema } from "graphql";
import { minifyIntrospectionQuery } from "@urql/introspection";
async function isUsingGraphQLTada(cwd) {
  const [pkgJson, tsConfig] = await Promise.allSettled([
    fs.readFile(path.resolve(cwd, "package.json"), "utf-8"),
    fs.readFile(path.resolve(cwd, "tsconfig.json"), "utf-8")
  ]);
  if (pkgJson.status === "rejected" || tsConfig.status === "rejected") {
    return false;
  }
  try {
    const parsed = JSON.parse(pkgJson.value);
    const merged = Object.keys({
      ...parsed.dependencies,
      ...parsed.devDependencies
    });
    if (!merged.find((x) => x.includes("gql.tada"))) {
      return false;
    }
    if (!merged.find((x) => x.includes("@0no-co/graphqlsp"))) {
      return false;
    }
  } catch (e) {
    return false;
  }
  try {
    const parsed = JSON.parse(tsConfig.value);
    const lspPlugin = parsed.compilerOptions.plugins.find(
      (plugin) => plugin.name === "@0no-co/graphqlsp"
    );
    if (!lspPlugin) {
      return false;
    }
    if (!lspPlugin.tadaOutputLocation) {
      return false;
    }
  } catch (e) {
    return tsConfig.value.includes("@0no-co/graphqlsp") && tsConfig.value.includes("tadaOutputLocation");
  }
  return true;
}
var tadaGqlContents = `import { initGraphQLTada } from 'gql.tada';
import type { introspection } from './introspection';

export const graphql = initGraphQLTada<{
  introspection: typeof introspection;
}>();

export type { FragmentOf, ResultOf, VariablesOf } from 'gql.tada';
export type { FragmentOf as FragmentType } from 'gql.tada';
export { readFragment } from 'gql.tada';
export { readFragment as useFragment } from 'gql.tada';
`;
async function ensureTadaIntrospection(location, shouldWatch) {
  const schemaLocation = path.resolve(location, "schema.graphql");
  const writeTada = async () => {
    try {
      const content = await fs.readFile(schemaLocation, "utf-8");
      const schema = buildSchema(content);
      const introspection = introspectionFromSchema(schema, {
        descriptions: false
      });
      const minified = minifyIntrospectionQuery(introspection, {
        includeDirectives: false,
        includeEnums: true,
        includeInputs: true,
        includeScalars: true
      });
      const json = JSON.stringify(minified, null, 2);
      const hasSrcDir = existsSync(path.resolve(location, "src"));
      const base = hasSrcDir ? path.resolve(location, "src") : location;
      const outputLocation = path.resolve(base, "fuse", "introspection.ts");
      const contents = [
        preambleComments,
        tsAnnotationComment,
        `const introspection = ${json} as const;
`,
        "export { introspection };"
      ].join("\n");
      await fs.writeFile(outputLocation, contents);
    } catch (e) {
    }
  };
  await writeTada();
  if (shouldWatch) {
    watch(schemaLocation, async () => {
      await writeTada();
    });
  }
}
var preambleComments = ["/* eslint-disable */", "/* prettier-ignore */"].join("\n") + "\n";
var tsAnnotationComment = [
  "/** An IntrospectionQuery representation of your schema.",
  " *",
  " * @remarks",
  " * This is an introspection of your schema saved as a file by GraphQLSP.",
  " * You may import it to create a `graphql()` tag function with `gql.tada`",
  " * by importing it and passing it to `initGraphQLTada<>()`.",
  " *",
  " * @example",
  " * ```",
  " * import { initGraphQLTada } from 'gql.tada';",
  " * import type { introspection } from './introspection';",
  " *",
  " * export const graphql = initGraphQLTada<{",
  " *   introspection: typeof introspection;",
  " *   scalars: {",
  " *     DateTime: string;",
  " *     Json: any;",
  " *   };",
  " * }>();",
  " * ```",
  " */"
].join("\n");

// src/utils/codegen.ts
import { generate, CodegenContext } from "@graphql-codegen/cli";
import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import { existsSync as existsSync2, promises as fs2 } from "fs";
import path2 from "path";
async function boostrapCodegen(location, watch2) {
  const baseDirectory = process.cwd();
  const hasSrcDir = existsSync2(path2.resolve(baseDirectory, "src"));
  const contents = `export * from "./fragment-masking";
export * from "./gql";
export * from "fuse/client";
`;
  const ctx = new CodegenContext({
    filepath: "codgen.yml",
    config: {
      ignoreNoDocuments: true,
      errorsOnly: true,
      noSilentErrors: true,
      hooks: {
        afterOneFileWrite: async () => {
          await fs2.writeFile(
            hasSrcDir ? baseDirectory + "/src/fuse/index.ts" : baseDirectory + "/fuse/index.ts",
            contents
          );
        }
      },
      watch: watch2 ? [
        hasSrcDir ? baseDirectory + "/src/**/*.{ts,tsx}" : baseDirectory + "/**/*.{ts,tsx}",
        "!./{node_modules,.next,.git}/**/*",
        hasSrcDir ? "!./src/fuse/*.{ts,tsx}" : "!./fuse/*.{ts,tsx}"
      ] : false,
      schema: location,
      generates: {
        [hasSrcDir ? baseDirectory + "/src/fuse/" : baseDirectory + "/fuse/"]: {
          documents: [
            hasSrcDir ? "./src/**/*.{ts,tsx}" : "./**/*.{ts,tsx}",
            "!./{node_modules,.next,.git}/**/*",
            hasSrcDir ? "!./src/fuse/*.{ts,tsx}" : "!./fuse/*.{ts,tsx}"
          ],
          preset: "client",
          // presetConfig: {
          //   persistedDocuments: true,
          // },
          config: {
            scalars: {
              ID: {
                input: "string",
                output: "string"
              },
              DateTime: DateTimeResolver.extensions.codegenScalarType,
              JSON: JSONResolver.extensions.codegenScalarType
            },
            avoidOptionals: false,
            enumsAsTypes: true,
            nonOptionalTypename: true,
            skipTypename: false
          }
        }
      }
    }
  });
  await generate(ctx, true);
}

// src/cli.ts
var prog = sade("fuse");
prog.version("0.12.1");
prog.command("build").describe("Creates the build output for server and client.").option(
  "--adapter",
  "Which adapter to use for building, options are lambda, cloudflare, bun and node (default)",
  "node"
).option(
  "--server",
  'Whether to look for the "types/" directory and create a server build output.'
).option(
  "--client",
  "Whether to look for GraphQL documents and generate types."
).option(
  "--schema",
  'Where to find the schema, either a "*.graphql" file or an endpoint that can be introspected.',
  "./schema.graphql"
).action(async (opts) => {
  if (!opts.server && !opts.client) {
    opts.server = true;
    opts.client = true;
  }
  if (opts.server) {
    const baseDirectory2 = process.cwd();
    let entryPoint = "node.mjs";
    switch (opts.adapter) {
      case "lambda": {
        entryPoint = "lambda.mjs";
        break;
      }
      case "bun": {
        entryPoint = "bun.mjs";
        break;
      }
      case "cloudflare": {
        entryPoint = "cloudflare.mjs";
        break;
      }
      default: {
        entryPoint = "node.mjs";
        break;
      }
    }
    await build({
      build: {
        outDir: path3.resolve(baseDirectory2, "build"),
        rollupOptions: {
          logLevel: "silent"
        }
      },
      plugins: [
        ...VitePluginNode({
          async adapter() {
          },
          appName: "fuse",
          appPath: path3.resolve(
            baseDirectory2,
            "node_modules",
            "fuse",
            "dist",
            "adapters",
            entryPoint
          ),
          exportName: "main"
        })
      ]
    });
    console.log("Server build output created in ./build");
  }
  const baseDirectory = process.cwd();
  if (opts.client) {
    if (!await isUsingGraphQLTada(baseDirectory)) {
      await boostrapCodegen(opts.schema, false);
    } else {
      const hasSrcDir = existsSync3(path3.resolve(baseDirectory, "src"));
      const base = hasSrcDir ? path3.resolve(baseDirectory, "src") : baseDirectory;
      if (!existsSync3(path3.resolve(base, "fuse"))) {
        await fs3.mkdir(path3.resolve(base, "fuse"));
      }
      await Promise.allSettled([
        fs3.writeFile(
          path3.resolve(base, "fuse/index.ts"),
          `// This is a generated file!

export * from './tada';
export * from 'fuse/client';
`
        ),
        fs3.writeFile(path3.resolve(base, "fuse/tada.ts"), tadaGqlContents)
      ]);
    }
  }
}).command("dev").describe("Runs the dev-server for the client and server by default.").option(
  "--port",
  "Which port to use for the dev-server (default: 4000)",
  4e3
).option(
  "--server",
  'Whether to look for the "types/" directory and create a server build output.'
).option(
  "--client",
  "Whether to look for GraphQL documents and generate types."
).option(
  "--schema",
  'Where to find the schema, either a "*.graphql" file or an endpoint that can be introspected.',
  "./schema.graphql"
).action(async (opts) => {
  if (!opts.server && !opts.client) {
    opts.server = true;
    opts.client = true;
  }
  const baseDirectory = process.cwd();
  const isUsingTada = opts.client && await isUsingGraphQLTada(baseDirectory);
  let hasTadaWatcherRunning = false;
  if (opts.server) {
    let yoga;
    const server = await createServer({
      plugins: [
        ...VitePluginNode({
          initAppOnBoot: true,
          async adapter({ app, req, res }) {
            yoga = await app(opts).then((yo) => {
              fs3.writeFile(
                path3.resolve(baseDirectory, "schema.graphql"),
                yo.stringifiedSchema,
                "utf-8"
              ).then(() => {
                if (isUsingTada && !hasTadaWatcherRunning) {
                  hasTadaWatcherRunning = true;
                  ensureTadaIntrospection(baseDirectory, true);
                }
              });
              return yo;
            });
            await yoga.handle(req, res);
          },
          appPath: path3.resolve(
            baseDirectory,
            "node_modules",
            "fuse",
            "dist",
            "dev.mjs"
          ),
          exportName: "main"
        })
      ]
    });
    server.watcher.on("change", async (file) => {
      if (file.includes("types/")) {
        if (isUsingTada) {
          setTimeout(() => {
            fetch(
              `http://localhost:${opts.port}/graphql?query={__typename}`
            ).catch(() => {
            });
          }, 500);
        }
        server.restart();
      }
    });
    await server.listen(opts.port);
    console.log(`Server listening on http://localhost:${opts.port}/graphql`);
  }
  if (opts.client) {
    if (!isUsingTada) {
      setTimeout(() => {
        fetch(`http://localhost:${opts.port}/graphql?query={__typename}`).then(() => {
          boostrapCodegen(opts.schema, true);
        }).catch(() => {
        });
      }, 1e3);
    } else {
      setTimeout(() => {
        fetch(
          `http://localhost:${opts.port}/graphql?query={__typename}`
        ).catch(() => {
        });
      }, 1e3);
      const hasSrcDir = existsSync3(path3.resolve(baseDirectory, "src"));
      const base = hasSrcDir ? path3.resolve(baseDirectory, "src") : baseDirectory;
      if (!existsSync3(path3.resolve(base, "fuse"))) {
        await fs3.mkdir(path3.resolve(base, "fuse"));
      }
      await Promise.allSettled([
        fs3.writeFile(
          path3.resolve(base, "fuse/index.ts"),
          `// This is a generated file!

export * from './tada';
export * from 'fuse/client';
`
        ),
        fs3.writeFile(path3.resolve(base, "fuse/tada.ts"), tadaGqlContents)
      ]);
    }
  }
});
prog.parse(process.argv);
