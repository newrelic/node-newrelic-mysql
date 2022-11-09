/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const setup = require('./setup')
const utils = require('@newrelic/test-utilities')

const params = setup.params

module.exports = (t, requireMySQL) => {
  t.test('MySQL transactions', { timeout: 30000 }, (t) => {
    t.autoend()
    let helper = null
    let mysql = null

    t.beforeEach(async function () {
      // set up the instrumentation before loading MySQL
      helper = utils.TestAgent.makeInstrumented()
      setup.registerInstrumentation(helper)
      mysql = requireMySQL()
      await setup(mysql)
    })

    t.teardown(() => helper.unload())

    t.test('basic transaction', (t) => {
      const client = mysql.createConnection(params)

      t.teardown(() => client.end())

      t.notOk(helper.getTransaction(), 'no transaction should be in play yet')
      helper.runInTransaction((txn) => {
        client.beginTransaction((err) => {
          if (!t.error(err)) {
            t.end()
            return
          }
          t.transaction(txn)

          // trying the object mode of client.query
          client.query({ sql: 'SELECT 1', timeout: 10 }, (err) => {
            if (!t.error(err)) {
              t.end()
              return
            }

            t.transaction(txn)
            client.commit((err) => {
              if (!t.error(err)) {
                t.end()
                return
              }

              t.transaction(txn)
              t.end()
            })
          })
        })
      })
    })
  })
}
