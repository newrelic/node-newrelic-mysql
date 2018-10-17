'use strict'

/**
 * Allows users to `require('@newrelic/mysql')` directly in their app. If they
 * for some reason choose to explicitly use an older version of our instrumentation
 * then the supportability metrics for custom instrumentation will trigger.
 */
const newrelic = require('newrelic')
const instrumentation = require('./lib/instrumentation')

newrelic.instrumentWebframework('mysql', instrumentation.callbackInitialize)
newrelic.instrumentWebframework('mysql2', instrumentation.callbackInitialize)
newrelic.instrumentWebframework('mysql2/promise', instrumentation.promiseInitialize)
