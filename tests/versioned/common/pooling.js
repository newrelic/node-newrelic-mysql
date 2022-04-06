/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const setup = require('./setup')
const utils = require('@newrelic/test-utilities')

module.exports = (t, requireMySQL) => {
  t.test('MySQL instrumentation with a connection pool', { timeout: 30000 }, (t) => {
    t.autoend()
    let helper = null
    let mysql = null
    let pool = null

    t.beforeEach(async function () {
      helper = utils.TestAgent.makeInstrumented()
      helper.registerInstrumentation({
        moduleName: 'mysql',
        type: 'datastore',
        onRequire: require('../../../lib/instrumentation').callbackInitialize
      })
      mysql = requireMySQL()
      pool = setup.pool(mysql)
      await setup(mysql)
    })

    t.teardown(() => {
      pool.drain(() => {
        pool.destroyAllNow()
        helper.unload()
      })
    })

    const withRetry = {
      getClient: (callback, counter) => {
        if (!counter) {
          counter = 1
        }
        counter++

        pool.acquire((err, client) => {
          if (err) {
            if (counter < 10) {
              pool.destroy(client)
              withRetry.getClient(callback, counter)
            } else {
              callback(new Error("Couldn't connect to DB after 10 attempts."))
            }
          } else {
            callback(null, client)
          }
        })
      },

      release: function (client) {
        pool.release(client)
      }
    }

    const dal = {
      lookup: (params, callback) => {
        if (!params.id) {
          callback(new Error('Must include ID to look up.'))
          return
        }

        withRetry.getClient((err, client) => {
          if (err) {
            callback(err)
            return
          }

          const query = `SELECT * FROM ${setup.params.database}.test WHERE id = ?`
          client.query(query, [params.id], (err, results) => {
            withRetry.release(client) // always release back to the pool

            if (err) {
              callback(err)
              return
            }

            callback(null, results.length ? results[0] : results)
          })
        })
      }
    }

    t.test('basic transaction', (t) => {
      t.notOk(helper.getTransaction(), 'no transaction should be in play yet')
      helper.runInTransaction((txn) => {
        const context = {
          id: 1
        }
        dal.lookup(context, (error, row) => {
          if (!t.error(error) || !t.transaction(txn)) {
            t.end()
            return
          }

          // need to inspect on next tick, otherwise calling transaction.end() here
          // in the callback (which is its own segment) would mark it as truncated
          // (since it has not finished executing)
          setImmediate(() => {
            if (!t.transaction(txn)) {
              t.end()
              return
            }

            t.equal(row.id, 1, 'mysql should still work (found id)')
            t.equal(
              row.test_value,
              'hamburgefontstiv',
              'mysql driver should still work (found value)'
            )

            txn.end()

            const trace = txn.trace
            t.ok(trace, 'trace should exist')
            t.ok(trace.root, 'root element should exist.')

            t.ok(trace.root.children.length < 3, 'should have one or two children')

            const selectSegment = trace.root.children[trace.root.children.length - 1]
            t.ok(selectSegment, 'trace segment for first SELECT should exist')
            t.equal(
              selectSegment.name,
              `Datastore/statement/MySQL/${setup.params.database}.test/select`,
              'should register as SELECT'
            )

            t.equal(selectSegment.children.length, 1, 'should have a callback segment')
            t.equal(selectSegment.children[0].name, 'Callback: <anonymous>')

            selectSegment.children[0].children
              .map((segment) => segment.name)
              .forEach((segmentName) => {
                if (
                  segmentName !== 'timers.setTimeout' &&
                  segmentName !== 'Truncated/timers.setTimeout'
                ) {
                  t.fail('callback segment should have only timeout children')
                }
              })
            t.end()
          })
        })
      })
    })
  })
}
