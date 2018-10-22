'use strict'

const instrumentation = require('./lib/instrumentation')

module.exports = [{
  type: 'datastore',
  moduleName: 'mysql',
  onRequire: instrumentation.callbackInitialize
}, {
  type: 'datastore',
  moduleName: 'mysql2',
  onRequire: instrumentation.callbackInitialize
}, {
  type: 'datastore',
  moduleName: 'mysql2/promise',
  onRequire: instrumentation.promiseInitialize
}]
