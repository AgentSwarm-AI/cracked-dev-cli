#!/usr/bin/env node

import { Errors, flush, run } from "@oclif/core";
import "reflect-metadata";

const main = async () => {
  try {
    await run(undefined, import.meta.url);
    await flush();
  } catch (error) {
    Errors.handle(error);
    process.exit(1);
  }
};

main();
