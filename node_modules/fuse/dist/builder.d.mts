import '@pothos/core'
import '@pothos/plugin-scope-auth'
import '@pothos/plugin-dataloader'
import '@pothos/plugin-relay'
import * as _pothos_core_dts_refs_union from '@pothos/core/dts/refs/union';
import * as _pothos_core_dts_refs_interface from '@pothos/core/dts/refs/interface';
import * as _pothos_plugin_dataloader from '@pothos/plugin-dataloader';
import { LoadableNodeOptions } from '@pothos/plugin-dataloader';
import { MaybePromise, SchemaTypes, OutputType, ShapeFromTypeParam, BasePlugin, InputFieldMap, Resolver, InputShapeFromFields, FieldKind, FieldOptionsFromKind, InputFieldsFromShape, FieldRef, InterfaceParam, ObjectTypeOptions, ImplementableObjectRef, EnumValues, EnumRef, ShapeFromEnumValues, InputObjectRef, InputFieldBuilder } from '@pothos/core';
import { GraphQLParams, YogaInitialContext } from 'graphql-yoga';
export { decodeGlobalID, encodeGlobalID } from '@pothos/plugin-relay';
import { GraphQLError } from 'graphql';

interface ListResultShape<T> {
    totalCount?: number | null;
    nodes: MaybePromise<T>[];
}
type ListShape<Types extends SchemaTypes, T, Nullable, ListResult extends ListResultShape<T> = ListResultShape<T>> = (Nullable extends false ? never : null | undefined) | (ListResult & Types['ListWrapper']);
type ListShapeForType<Types extends SchemaTypes, Type extends OutputType<Types>, Nullable extends boolean, ListResult extends ListResultShape<ShapeFromTypeParam<Types, Type, Nullable>> = ListResultShape<ShapeFromTypeParam<Types, Type, Nullable>>> = ListShape<Types, ShapeFromTypeParam<Types, Type, Nullable>, Nullable, ListResult>;

declare class PothosListPlugin<Types extends SchemaTypes> extends BasePlugin<Types> {
}

declare global {
    export namespace PothosSchemaTypes {
        interface Plugins<Types extends SchemaTypes> {
            fuselist: PothosListPlugin<Types>;
        }
        interface UserSchemaTypes {
            ListWrapper: {};
        }
        interface SchemaBuilder<Types extends SchemaTypes> {
            listObject: <Type extends OutputType<Types>, NodeNullable extends boolean>(listOptions: {
                name: string;
                type: Type;
                nullable: NodeNullable;
            }) => ObjectRef<ListShapeForType<Types, Type, NodeNullable>>;
        }
        interface ListFieldOptions<Types extends SchemaTypes, ParentShape, Type extends OutputType<Types>, Nullable extends boolean, NodeNullability extends boolean, Args extends InputFieldMap, ResolveReturnShape, ConnectionResult extends ListResultShape<ShapeFromTypeParam<Types, Type, NodeNullability>> = ListResultShape<ShapeFromTypeParam<Types, Type, NodeNullability>>> {
            type: Type;
            args?: Args;
            nullable?: Nullable;
            nodeNullable?: NodeNullability;
            resolve: Resolver<ParentShape, InputShapeFromFields<Args>, Types['Context'], ListShapeForType<Types, Type, NodeNullability, ConnectionResult>, ResolveReturnShape>;
        }
        interface RootFieldBuilder<Types extends SchemaTypes, ParentShape, Kind extends FieldKind = FieldKind> {
            list: <Type extends OutputType<Types>, Args extends InputFieldMap, Nullable extends boolean, NodeNullable extends boolean, ResolveShape, ResolveReturnShape, ConnectionResult extends ListResultShape<ShapeFromTypeParam<Types, Type, NodeNullable>> = ListResultShape<ShapeFromTypeParam<Types, Type, NodeNullable>>>(options: FieldOptionsFromKind<Types, ParentShape, Type, Nullable, InputFieldsFromShape<InputFieldMap extends Args ? {} : Args>, Kind, ResolveShape, ResolveReturnShape> extends infer FieldOptions ? ListFieldOptions<Types, FieldOptions extends {
                resolve?: (parent: infer P, ...args: any[]) => unknown;
            } ? P : unknown extends ResolveShape ? ParentShape : ResolveShape, Type, Nullable, NodeNullable, Args, ResolveReturnShape, ConnectionResult> & Omit<FieldOptions, 'args' | 'resolve' | 'type'> : never) => FieldRef<ListShapeForType<Types, Type, Nullable>>;
        }
    }
}

type InitialContext = {
    headers: Headers;
    params: GraphQLParams;
    request: YogaInitialContext['request'];
};
type UserContext = Record<string, any>;
type GetContext<AdditionalContext> = ((ctx: InitialContext) => UserContext & AdditionalContext) | ((ctx: InitialContext) => Promise<UserContext & AdditionalContext>) | (UserContext & AdditionalContext);
interface StellateOptions {
    loggingToken: string;
    serviceName: string;
}

declare abstract class FuseError extends GraphQLError {
    abstract readonly name: string;
    constructor(message: string, extensions: {
        code: string;
        http?: {
            status: number;
        };
    });
}
/** For use when user is not authenticated or unknown. */
declare class AuthenticationError extends FuseError {
    name: string;
    constructor(message?: string);
}
/** For use when a resource is not found or not accessible by an authenticated user. */
declare class ForbiddenError extends FuseError {
    name: string;
    constructor(message?: string);
}
/** For use when a resource is not found. */
declare class NotFoundError extends FuseError {
    name: string;
    constructor(message?: string);
}
/** For use when any input was invalid or when a resource does not exist but is assumed to exist. */
declare class BadRequestError extends FuseError {
    name: string;
    constructor(message?: string);
}

declare const builder: PothosSchemaTypes.SchemaBuilder<PothosSchemaTypes.ExtendDefaultTypes<{
    Context: {
        request: Request;
        params: GraphQLParams;
    } & UserContext;
    AuthScopes: Scopes;
    DefaultFieldNullability: true;
    Scalars: {
        JSON: {
            Input: unknown;
            Output: unknown;
        };
        Date: {
            Input: Date;
            Output: Date;
        };
    };
}>>;
type Builder = Omit<typeof builder, 'addScalarType' | 'loadableInterface' | 'loadableUnion' | 'objectType' | 'loadableInterfaceRef' | 'loadableObjectRef' | 'nodeInterfaceRef' | 'inputRef' | 'objectRef' | 'scalarType' | 'interfaceField' | 'listObject' | 'node' | 'options' | 'pageInfoRef' | 'subscriptionType' | 'queryFields' | 'queryType' | 'mutationType' | 'mutationFields' | 'connectionObject' | 'edgeObject' | 'configStore' | 'defaultFieldNullability' | 'defaultInputFieldRequiredness' | 'globalConnectionField' | 'globalConnectionFields' | 'args' | 'loadableNode' | 'loadableNodeRef' | 'interfaceFields' | 'subscriptionFields' | 'subscriptionField' | 'relayMutationField' | 'enumType' | 'inputType' | 'interfaceRef' | 'interfaceType' | 'loadableObject' | 'mutationField' | 'mutationFields' | 'objectField' | 'objectFields' | 'queryField' | 'unionType'>;
declare const reducedBuilder: Builder;

type BuilderTypes = typeof builder extends PothosSchemaTypes.SchemaBuilder<infer T> ? T : never;
/**
 * An overridable type, which will be used in all your schema-building functions to inform
 * you what scopes are available to be used.
 *
 * @example
 * ```ts
 * import 'fuse'
 * import { defineAuthScopes, Scopes } from 'fuse'
 *
 * declare module 'fuse' {
 *   export interface Scopes {
 *     isLoggedIn: boolean
 *   }
 * }
 * ```
 */
interface Scopes {
}
/**
 * A function to define auth-scopes that can be used throughout your schema
 * definition to authorize both fields as well as types.
 *
 * @remarks
 * This function should only be called once and will carry your scope-definitions for
 * the lifetime of the application.
 *
 * @example
 * ```ts
 * defineAuthScopes((ctx) => ({ isLoggedIn: !!ctx.user }))
 * addQueryFields((t) => ({
 *   me: t.field({
 *     type: User,
 *     authScopes: {
 *       isLoggedIn: true,
 *     },
 *     resolve: async (_, args, context) => {
 *       // return the user
 *     }
 *   }),
 * }))
 * ```
 */
declare const defineAuthScopes: (func: (ctx: any) => Promise<Scopes> | Scopes) => void;
/** A function to create a keyed object, this will inherit from the `Node` interface and hence be
 * query-able from `node(id: ID!): Node` and `nodes(ids: [ID!]!): [Node]`. Additionally a Query.typeName
 * will be created that you can query with (id: ID!).
 *
 * @remarks
 * This is a helper function to create a node with an associated way to fetch it.
 * Nodes get assigned a unique ID which is derived from `base64Encode(nameOfType + node[key || 'id'])`.
 * The fields property can be used to rename properties, type them and even create custom resolve functions
 * for computed properties or transformations.
 * Optionally when the output-type has no `id` property you can use the `key` option to specify a different
 * property used to uniquely identify the node.
 *
 * @example
 * ```ts
 * export const LaunchNode = node<OutputType, typeof key>({
 *   name: 'Launch',
 *   key: 'flight_number',
 *   async load(ids) {
 *     // get and return the data
 *   }
 *   fields: (t) => ({
 *     // we tell our node that it can find the name on a different property named mission_name and to
 *     // expose it as a string.
 *     name: t.exposeString('mission_name'),
 *     details: t.exposeString('details', { nullable: true }),
 *     image: t.field({
 *      type: 'String',
 *       resolve: (parent) => parent.links.mission_patch,
 *     }),
 *     launchDate: t.exposeString('launch_date_utc'),
 *   }),
 * })
 * ```
 */
declare function node<T extends {}, Key extends string | number = string, Interfaces extends InterfaceParam<BuilderTypes>[] = InterfaceParam<BuilderTypes>[]>(opts: ('id' extends keyof T ? {
    name: string;
    key?: keyof T;
    description?: string;
    load: (ids: Array<string | Key>, ctx: Record<string, unknown>) => Promise<Array<T | Error>>;
} : {
    name: string;
    key: keyof T;
    description?: string;
    load: (ids: Array<string | Key>, ctx: Record<string, unknown>) => Promise<Array<T | Error>>;
}) & Pick<LoadableNodeOptions<BuilderTypes, T, Interfaces, string, string | number, string | number, string | number>, 'authScopes' | 'fields' | 'interfaces' | 'isTypeOf'>): Omit<_pothos_plugin_dataloader.ImplementableLoadableNodeRef<PothosSchemaTypes.ExtendDefaultTypes<{
    Context: {
        request: Request;
        params: GraphQLParams<Record<string, any>, Record<string, any>>;
    } & UserContext;
    AuthScopes: Scopes;
    DefaultFieldNullability: true;
    Scalars: {
        JSON: {
            Input: unknown;
            Output: unknown;
        };
        Date: {
            Input: Date;
            Output: Date;
        };
    };
}>, T | Key, T, string, Key, Key>, "implement">;
/**
 * A function to create an (unkeyed) object that can be resolved, this can subsequently be used in a
 * query/mutation/node/...
 *
 * @example
 * ```ts
 * const Location = objectType<Resource['location']>({
 *   name: 'Location',
 *   fields: (t) => ({
 *     name: t.exposeString('name'),
 *     region: t.exposeString('region'),
 *     latitude: t.exposeFloat('latitude'),
 *     longitude: t.exposeFloat('longitude'),
 *   }),
 *})
 * ```
 */
declare function objectType<T, Interfaces extends InterfaceParam<BuilderTypes>[] = InterfaceParam<BuilderTypes>[]>(opts: {
    name: string;
} & Omit<ObjectTypeOptions<BuilderTypes, ImplementableObjectRef<BuilderTypes, T, T>, T, Interfaces>, 'name'>): PothosSchemaTypes.ObjectRef<T, T>;
/**
 * Add entry points to the graph, these can subsequently be used from your
 * front-end to query data.
 *
 * @example
 * ```ts
 * addQueryFields((t) => ({
 *   launches: t.list({
 *     description: 'Get a paginated list of launches.',
 *     type: LaunchNode,
 *     args: { limit: t.arg.int({ default: 10 }), offset: t.arg.int({ default: 0 }) }
 *     resolve: async (_, args) => {
 *       const data = fetch(`/launches?offset=${args.offset}&limit=${args.limit}`).then((x) => x.json()));
 *       return { nodes: data.results, totalCount: data.count }
 *     }
 *   })
 * })
 * ```
 */
declare const addQueryFields: typeof builder.queryFields;
/**
 * Add entry points to the graph, these can subsequently be used from your
 * front-end to query data.
 *
 * @example
 * ```ts
 * addMutationFields((t) => ({
 *   addToCart: t.field({
 *     description: 'Add a product to the cart.',
 *     type: Cart,
 *     args: { productId: t.arg.string() },
 *     resolve: async (_, args, context) => {
 *       const data = fetch('/cart', {
 *         method: 'POST',
 *         body: JSON.stringify({ product: args.productId }).
 *         headers: { Authorization: context.token }
 *       }).then((x) => x.json()));
 *       return data
 *     }
 *   })
 * })
 * ```
 */
declare const addMutationFields: typeof builder.mutationFields;
/**
 * Add more fields to an existing objectType.
 *
 * @example
 * ```ts
 * addObjectFields(CartObject, (t) => ({
 *   user: t.field({
 *     description: 'The user owning a certain cart.',
 *     type: User,
 *     resolve: (parent) => {
 *        const data = fetch(`/users/${parent.userId}`).then((x) => x.json()));
 *        return data;
 *     }
 *   })
 * })
 */
declare const addObjectFields: typeof builder.objectFields;
/**
 * Add more fields to an existing node.
 *
 * @example
 * ```ts
 * addNodeFields(LaunchNode, (t) => ({
 *   rocket: t.field({
 *     description: 'The rocket used for a given launch.',
 *     type: Rocket,
 *     resolve: (parent) => {
 *        const data = fetch(`/rockets/${parent.rocketId}`).then((x) => x.json()));
 *        return data;
 *     }
 *   })
 * })
 */
declare const addNodeFields: typeof builder.objectFields;
/**
 * Narrow down the possible values of a field by providing an enum.
 *
 * @example
 * ```ts
 * const SiteStatus = enumType({
 *  name: 'SiteStatus',
 *  description: 'Describes the Status of a given Launch Site',
 *  values: ['ACTIVE', 'INACTIVE', 'UNKNOWN'] as const
 * })
 *
 * // Which can then be used like
 * t.field({
 *   type: SiteStatus,
 *   resolve: (parent) => {
 *     switch (parent.status) {
 *       case 'active':
 *         return 'ACTIVE'
 *       case 'inactive':
 *         return 'INACTIVE'
 *       default:
 *         return 'UNKNOWN'
 *      }
 *    },
 * }),
 * ```
 */
declare const enumType: <Values extends EnumValues<PothosSchemaTypes.ExtendDefaultTypes<{
    Context: {
        request: Request;
        params: GraphQLParams;
    } & UserContext;
    AuthScopes: Scopes;
    DefaultFieldNullability: true;
    Scalars: {
        JSON: {
            Input: unknown;
            Output: unknown;
        };
        Date: {
            Input: Date;
            Output: Date;
        };
    };
}>>>(opts: {
    name: string;
} & PothosSchemaTypes.EnumTypeOptions<PothosSchemaTypes.ExtendDefaultTypes<{
    Context: {
        request: Request;
        params: GraphQLParams;
    } & UserContext;
    AuthScopes: Scopes;
    DefaultFieldNullability: true;
    Scalars: {
        JSON: {
            Input: unknown;
            Output: unknown;
        };
        Date: {
            Input: Date;
            Output: Date;
        };
    };
}>, Values>) => EnumRef<ShapeFromEnumValues<PothosSchemaTypes.ExtendDefaultTypes<{
    Context: {
        request: Request;
        params: GraphQLParams;
    } & UserContext;
    AuthScopes: Scopes;
    DefaultFieldNullability: true;
    Scalars: {
        JSON: {
            Input: unknown;
            Output: unknown;
        };
        Date: {
            Input: Date;
            Output: Date;
        };
    };
}>, Values>>;
interface InputObjectTypeOptions<Types extends SchemaTypes = BuilderTypes, Fields extends InputFieldMap = InputFieldMap> {
    isOneOf?: boolean;
    fields: (t: InputFieldBuilder<Types, 'InputObject'>) => Fields;
    description?: string;
    extensions?: Readonly<Record<string, unknown>>;
}
/**
 * Creates a re-usable input-type that can be used in arguments to your fields.
 *
 * @example
 * ```ts
 * const Pagination = inputType({
 *   description: 'The default pagination input type, allowing you to specify a limit and offset',
 *   name: 'Pagination',
 *   fields: (t) => ({
 *     limit: t.int({ default: 10 }),
 *     offset: t.int({ default: 0 })
 *   })
 * })
 *
 * addQueryFields((t) => ({
 *   myList: t.list({
 *     args: input: t.arg({ type: Pagination })
 *   })
 * })
 * ```
 */
declare const inputType: <Fields extends InputFieldMap>(opts: {
    name: string;
} & InputObjectTypeOptions<PothosSchemaTypes.ExtendDefaultTypes<{
    Context: {
        request: Request;
        params: GraphQLParams;
    } & UserContext;
    AuthScopes: Scopes;
    DefaultFieldNullability: true;
    Scalars: {
        JSON: {
            Input: unknown;
            Output: unknown;
        };
        Date: {
            Input: Date;
            Output: Date;
        };
    };
}>, Fields>) => InputObjectRef<InputShapeFromFields<Fields>>;
/**
 * Creates an interface-type which can be used in the `interfaces` option of `object` and `node`.
 *
 * @example
 * ```ts
 * const NewInterface = interfaceType<Shape, Parent>({
 *   name: 'NewInterface',
 *   resolveType: (parent) => 'Launch',
 *   fields: (t) => ({
 *     name: t.string()
 *   }),
 * })
 * ```
 */
declare const interfaceType: (opts: Parameters<(typeof builder)['interfaceType']>['1'] & {
    name: string;
}) => _pothos_core_dts_refs_interface.default<unknown, unknown>;
/**
 * Creates a union of types, these can be used in fields and will then have to resolve to
 * one of the union types.
 *
 * @example
 * ```ts
 * const NewInterface = unionType({
 *   name: 'Resource',
 *   resolveType: (parent) => 'Engine',
 *   types: [Fuel, Engine]
 * })
 * ```
 */
declare const unionType: (opts: Parameters<(typeof builder)['unionType']>['1'] & {
    name: string;
}) => _pothos_core_dts_refs_union.default<any, any>;

export { AuthenticationError, BadRequestError, ForbiddenError, FuseError, GetContext, InitialContext, NotFoundError, Scopes, StellateOptions, UserContext, addMutationFields, addNodeFields, addObjectFields, addQueryFields, reducedBuilder as builder, defineAuthScopes, enumType, inputType, interfaceType, node, objectType, unionType };
