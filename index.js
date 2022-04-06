/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * Allows users to `require('@newrelic/mysql')` directly in their app. If they
 * for some reason choose to explicitly use an older version of our instrumentation
 * then the supportability metrics for custom instrumentation will trigger.
 */
const newrelic = require('newrelic')
const instrumentation = require('./lib/instrumentation')

/** We only need to register the instrumentation once for both mysql and mysql2
 *  because there is some 🪄 in shimmer
 * See: https://github.com/newrelic/node-newrelic/blob/main/lib/shimmer.js#L459
 */
newrelic.instrumentDatastore('mysql', instrumentation.callbackInitialize)
newrelic.instrumentDatastore('mysql2/promise', instrumentation.promiseInitialize)
