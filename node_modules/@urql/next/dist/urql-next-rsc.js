Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');

/** Function to cache an urql-client across React Server Components.
 *
 * @param makeClient - A function that creates an urql-client.
 * @returns an object containing a getClient method.
 *
 * @example
 * ```ts
 * import { cacheExchange, createClient, fetchExchange, gql } from '@urql/core';
 * import { registerUrql } from '@urql/next/rsc';
 * const makeClient = () => {
 *   return createClient({
 *     url: 'https://trygql.formidable.dev/graphql/basic-pokedex',
 *     exchanges: [cacheExchange, fetchExchange],
 *   });
 * };
 *
 * const { getClient } = registerUrql(makeClient);
 * ```
 */
function registerUrql(makeClient) {
  // @ts-ignore you exist don't worry
  var getClient = React.cache(makeClient);
  return {
    getClient
  };
}

exports.registerUrql = registerUrql;
//# sourceMappingURL=urql-next-rsc.js.map
