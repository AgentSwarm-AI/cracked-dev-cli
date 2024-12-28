// src/builder.ts
import SchemaBuilder3 from "@pothos/core";
import RelayPlugin, { decodeGlobalID } from "@pothos/plugin-relay";
import ScopeAuthPlugin, {
  AuthScopeFailureType
} from "@pothos/plugin-scope-auth";
import DataloaderPlugin from "@pothos/plugin-dataloader";
import { DateResolver, JSONResolver } from "graphql-scalars";

// src/pothos-list/schema-builder.ts
import SchemaBuilder, { verifyRef } from "@pothos/core";
var schemaBuilderProto = SchemaBuilder.prototype;
var listRefs = /* @__PURE__ */ new WeakMap();
var globalListFieldsMap = /* @__PURE__ */ new WeakMap();
schemaBuilderProto.listObject = function listObject({
  type,
  name: listName,
  nullable
}) {
  verifyRef(type);
  const listRef = this.objectRef(listName);
  this.objectType(listRef, {
    fields: (t) => ({
      totalCount: t.int({
        nullable: true,
        resolve: (parent) => parent.totalCount || null
      }),
      nodes: t.field({
        nullable: {
          items: nullable ?? true,
          list: false
        },
        type: [type],
        resolve: (parent) => parent.nodes
      })
    })
  });
  if (!listRefs.has(this)) {
    listRefs.set(this, []);
  }
  listRefs.get(this).push(listRef);
  globalListFieldsMap.get(this)?.forEach((fieldFn) => void fieldFn(listRef));
  return listRef;
};

// src/pothos-list/index.ts
import SchemaBuilder2, {
  BasePlugin,
  RootFieldBuilder
} from "@pothos/core";
var pluginName = "fuselist";
var pothos_list_default = pluginName;
var PothosListPlugin = class extends BasePlugin {
};
try {
  SchemaBuilder2.registerPlugin(pluginName, PothosListPlugin);
} catch (e) {
}
var fieldBuilderProto = RootFieldBuilder.prototype;
fieldBuilderProto.list = function list(fieldOptions) {
  const ref = this.builder.objectRef(
    "Unnamed list"
  );
  const fieldRef = this.field({
    ...fieldOptions,
    type: ref,
    args: {
      ...fieldOptions.args
    },
    resolve: fieldOptions.resolve
  });
  this.builder.configStore.onFieldUse(fieldRef, (fieldConfig) => {
    const name = fieldConfig.name[0].toUpperCase() + fieldConfig.name.slice(1);
    const listName = `${this.typename}${name}${fieldConfig.name.toLowerCase().endsWith("list") ? "" : "List"}`;
    this.builder.listObject({
      type: fieldOptions.type,
      name: listName,
      nullable: fieldOptions.nodeNullable ?? true
    });
    this.builder.configStore.associateRefWithName(ref, listName);
  });
  return fieldRef;
};

// src/errors.ts
import { GraphQLError } from "graphql";
var FuseError = class extends GraphQLError {
  constructor(message, extensions) {
    super(message, {
      extensions
    });
  }
};
var AuthenticationError = class extends FuseError {
  constructor(message = "Unauthenticated") {
    super(message, { code: "UNAUTHENTICATED" });
    this.name = "UnauthenticatedError";
  }
};
var ForbiddenError = class extends FuseError {
  constructor(message = "Forbidden") {
    super(message, { code: "FORBIDDEN" });
    this.name = "ForbiddenError";
  }
};
var NotFoundError = class extends FuseError {
  constructor(message = "Not Found") {
    super(message, { code: "NOT_FOUND" });
    this.name = "NotFoundError";
  }
};
var BadRequestError = class extends FuseError {
  constructor(message = "Bad Request") {
    super(message, { code: "BAD_REQUEST" });
    this.name = "BadRequestError";
  }
};

// src/builder.ts
import { decodeGlobalID as decodeGlobalID2, encodeGlobalID } from "@pothos/plugin-relay";
function throwFirstError(failure) {
  if ("error" in failure && failure.error) {
    throw failure.error;
  }
  if (failure.kind === AuthScopeFailureType.AnyAuthScopes || failure.kind === AuthScopeFailureType.AllAuthScopes) {
    for (const child of failure.failures) {
      throwFirstError(child);
    }
  }
}
var builder = new SchemaBuilder3({
  plugins: [RelayPlugin, ScopeAuthPlugin, DataloaderPlugin, pothos_list_default],
  defaultFieldNullability: true,
  authScopes: async (context) => {
    return await scopesFunc(context);
  },
  scopeAuthOptions: {
    runScopesOnType: true,
    treatErrorsAsUnauthorized: true,
    unauthorizedError: (_, __, ___, result) => {
      throwFirstError(result.failure);
      throw new ForbiddenError("Not authorized");
    }
  },
  relayOptions: {
    clientMutationId: "omit",
    cursorType: "String"
  }
});
builder.queryType({
  fields: (t) => ({
    _version: t.string({
      nullable: false,
      resolve: () => "0.12.1"
    })
  })
});
builder.mutationType({
  fields: (t) => ({
    _version: t.string({
      nullable: false,
      resolve: () => "0.12.1"
    })
  })
});
builder.addScalarType("JSON", JSONResolver, {});
builder.addScalarType("Date", DateResolver, {});
var reducedBuilder = builder;
var scopesFunc = (ctx) => {
};
var hasCalledDefineAuthScopes = false;
var defineAuthScopes = (func) => {
  if (hasCalledDefineAuthScopes) {
    console.warn(
      "You can only call defineAuthScopes once, all but the first call have been ignored."
    );
  } else {
    hasCalledDefineAuthScopes = true;
    scopesFunc = func;
  }
};
function node(opts) {
  const node2 = builder.loadableNode(opts.name, {
    description: opts.description,
    isTypeOf: opts.isTypeOf,
    fields: opts.fields,
    interfaces: opts.interfaces,
    authScopes: opts.authScopes,
    id: {
      resolve: (parent) => {
        const key = parent[opts.key || "id"];
        if (!key) {
          throw new Error(
            "Could not find key for node, did you forget to set the 'key' option?"
          );
        }
        return key;
      }
    },
    async load(ids, ctx) {
      const translatedIds = ids.map((id) => {
        try {
          if (typeof id !== "string")
            return id;
          const decoded = decodeGlobalID(id);
          return decoded.id;
        } catch (e) {
          return id;
        }
      });
      const results = await opts.load(translatedIds, ctx);
      return results.map(
        (result) => result instanceof Error ? result : { ...result, __typename: opts.name }
      );
    }
  });
  builder.queryField(
    "" + opts.name[0].toLowerCase() + opts.name.slice(1),
    (t) => t.field({
      type: node2,
      args: {
        id: t.arg.id({ required: true })
      },
      // @ts-expect-error
      resolve: (parent, args) => {
        return args.id;
      }
    })
  );
  return node2;
}
function objectType(opts) {
  const { name, ...options } = opts;
  return builder.objectRef(name).implement(options);
}
var addQueryFields = builder.queryFields.bind(builder);
var addMutationFields = builder.mutationFields.bind(builder);
var addObjectFields = builder.objectFields.bind(builder);
var addNodeFields = builder.objectFields.bind(builder);
var enumType = (opts) => {
  const { name, ...options } = opts;
  return builder.enumType(name, options);
};
var inputType = (opts) => {
  const { name, ...options } = opts;
  return builder.inputType(name, options);
};
var interfaceType = (opts) => {
  const { name, ...options } = opts;
  return builder.interfaceRef(name).implement(options);
};
var unionType = (opts) => {
  const { name, ...options } = opts;
  return builder.unionType(name, options);
};
export {
  AuthenticationError,
  BadRequestError,
  ForbiddenError,
  FuseError,
  NotFoundError,
  addMutationFields,
  addNodeFields,
  addObjectFields,
  addQueryFields,
  reducedBuilder as builder,
  decodeGlobalID2 as decodeGlobalID,
  defineAuthScopes,
  encodeGlobalID,
  enumType,
  inputType,
  interfaceType,
  node,
  objectType,
  unionType
};
