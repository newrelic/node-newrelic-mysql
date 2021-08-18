/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')

utils(tap)

tap.test('mysql transactions', (t) => {
  t.autoend()
  require('../common/transactions')(t, (helper) => {
    if (helper) {
      helper.registerInstrumentation({
        moduleName: 'mysql',
        type: 'datastore',
        onRequire: require('../../../lib/instrumentation').callbackInitialize
      })
    }

    return require('mysql')
  })
})
