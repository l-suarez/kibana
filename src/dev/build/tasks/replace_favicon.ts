/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copy, Task } from '../lib';

export const ReplaceFavicon: Task = {
  description: 'Replacing favicons with built version',

  async run(config, log, build) {
    await copy(
      config.resolveFromRepo(
        'src/core/packages/apps/server-internal/assets/favicons/favicon.distribution.ico'
      ),
      build.resolvePath('src/core/packages/apps/server-internal/assets/favicons/favicon.ico')
    );

    await copy(
      config.resolveFromRepo(
        'src/core/packages/apps/server-internal/assets/favicons/favicon.distribution.png'
      ),
      build.resolvePath('src/core/packages/apps/server-internal/assets/favicons/favicon.png')
    );

    await copy(
      config.resolveFromRepo(
        'src/core/packages/apps/server-internal/assets/favicons/favicon.distribution.svg'
      ),
      build.resolvePath('src/core/packages/apps/server-internal/assets/favicons/favicon.svg')
    );
  },
};
