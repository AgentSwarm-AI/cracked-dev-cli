// src/dev.ts
import { builder } from "fuse";
import { printSchema } from "graphql";
import { createYoga } from "graphql-yoga";

// src/utils/yoga-helpers.ts
import { blockFieldSuggestionsPlugin } from "@escape.tech/graphql-armor-block-field-suggestions";
import { useDeferStream } from "@graphql-yoga/plugin-defer-stream";
import { useDisableIntrospection } from "@graphql-yoga/plugin-disable-introspection";
import { createStellateLoggerPlugin } from "stellate/graphql-yoga";
var getYogaPlugins = (stellate) => {
  return [
    useDeferStream(),
    process.env.NODE_ENV === "production" && useDisableIntrospection(),
    process.env.NODE_ENV === "production" && blockFieldSuggestionsPlugin(),
    Boolean(process.env.NODE_ENV === "production" && stellate) && createStellateLoggerPlugin({
      serviceName: stellate.serviceName,
      token: stellate.loggingToken,
      fetch
    })
  ].filter(Boolean);
};
var wrappedContext = (context) => {
  return async (ct) => {
    const baseContext = {
      request: ct.request,
      headers: ct.request.headers,
      params: ct.params
    };
    if (typeof context === "function") {
      const userCtx = context(baseContext);
      if (userCtx.then) {
        const result = await userCtx;
        return {
          ...baseContext,
          ...result
        };
      }
      return {
        ...baseContext,
        ...userCtx
      };
    } else if (typeof context === "object") {
      return {
        ...baseContext,
        ...context
      };
    }
    return baseContext;
  };
};

// src/dev.ts
var defaultQuery = (
  /* GraphQL */
  `query {
  _version
}
`
);
async function main() {
  const modules = import.meta.glob("/types/**/*.ts");
  const context = import.meta.glob("/_context.ts");
  const promises = [];
  let ctx;
  if (context["/_context.ts"]) {
    promises.push(
      context["/_context.ts"]().then((mod) => {
        if (mod.getContext) {
          ctx = mod.getContext;
        }
      })
    );
  }
  for (const path in modules) {
    promises.push(modules[path]());
  }
  await Promise.all(promises);
  const completedSchema = builder.toSchema({});
  const yoga = createYoga({
    schema: completedSchema,
    // We allow batching by default
    graphiql: {
      title: "Fuse GraphiQL",
      defaultQuery
    },
    batching: true,
    context: wrappedContext(ctx),
    plugins: getYogaPlugins()
  });
  yoga.stringifiedSchema = printSchema(completedSchema);
  return yoga;
}
export {
  main
};
