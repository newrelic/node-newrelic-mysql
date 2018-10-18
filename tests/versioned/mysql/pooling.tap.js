'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')


utils(tap)

tap.test('mysql pooling', (t) => {
  t.autoend()
  require('../common/pooling')(t, (helper) => {
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
