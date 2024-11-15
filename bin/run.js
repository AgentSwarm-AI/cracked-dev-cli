#!/usr/bin/env node

import { Errors, flush, run } from '@oclif/core';

try {
  await run(undefined, import.meta.url);
  await flush();
} catch (error) {
  Errors.handle(error);
  process.exit(1);
}
