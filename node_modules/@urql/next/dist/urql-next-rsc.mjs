import * as r from "react";

function registerUrql(e) {
  return {
    getClient: r.cache(e)
  };
}

export { registerUrql };
//# sourceMappingURL=urql-next-rsc.mjs.map
