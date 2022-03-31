/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')

utils(tap)

tap.test('mysql pooling', (t) => {
  t.autoend()
  require('../common/pooling')(t, () => require('mysql'))
})
