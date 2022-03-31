/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const instrumentation = require('./lib/instrumentation')

/** We only need to register the instrumentation once for both mysql and mysql2
 *  because there is some 🪄 in shimmer
 * See: https://github.com/newrelic/node-newrelic/blob/main/lib/shimmer.js#L459
 */
module.exports = [
  {
    type: 'datastore',
    moduleName: 'mysql',
    onRequire: instrumentation.callbackInitialize
  },
  {
    type: 'datastore',
    moduleName: 'mysql2/promise',
    onRequire: instrumentation.promiseInitialize
  }
]
