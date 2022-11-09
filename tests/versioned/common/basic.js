/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

process.env.NEW_RELIC_HOME = __dirname

const setup = require('./setup')
const utils = require('@newrelic/test-utilities')

const params = setup.params

module.exports = (t, pkgName, requireMySQL) => {
  t.test(`Basic run through ${pkgName} functionality`, { timeout: 30 * 1000 }, (t) => {
    t.autoend()

    let helper = null
    let contextManager = null
    let mysql = null
    let pool = null

    t.beforeEach(async function () {
      helper = utils.TestAgent.makeInstrumented()
      contextManager = helper.getContextManager()
      setup.registerInstrumentation(helper)
      mysql = requireMySQL()
      pool = setup.pool(mysql)
      await setup(mysql)
    })

    t.afterEach(async function () {
      if (!pool) {
        return
      }

      await new Promise((resolve) => {
        pool.drain(() => {
          pool.destroyAllNow()
          helper.unload()
          resolve()
        })
      })
    })

    const withRetry = {
      getClient: function (callback, counter) {
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

    t.test('basic transaction', (t) => {
      t.notOk(helper.getTransaction(), 'no transaction should be in play yet')
      helper.runInTransaction((txn) => {
        withRetry.getClient((err, client) => {
          if (!t.error(err)) {
            t.end()
            return
          }

          t.transaction(txn)
          client.query('SELECT 1', (err) => {
            if (!t.error(err)) {
              t.end()
              return
            }

            t.transaction(txn)
            withRetry.release(client)

            txn.end()
            checkQueries(t, helper)
            t.end()
          })
        })
      })
    })

    t.test('query with values', (t) => {
      helper.runInTransaction((txn) => {
        withRetry.getClient((err, client) => {
          if (!t.error(err)) {
            t.end()
            return
          }

          t.transaction(txn)
          client.query('SELECT 1', [], (err) => {
            if (!t.error(err)) {
              t.end()
              return
            }

            t.transaction(txn)
            withRetry.release(client)
            txn.end()
            checkQueries(t, helper)
            t.end()
          })
        })
      })
    })

    t.test('query with options streaming should work', (t) => {
      helper.runInTransaction((txn) => {
        withRetry.getClient((err, client) => {
          if (!t.error(err)) {
            t.end()
            return
          }

          t.transaction(txn)
          const query = client.query('SELECT 1', [])
          let results = false

          query.on('result', () => {
            results = true
          })

          query.on('error', (err) => {
            if (!t.error(err)) {
              t.end()
              return
            }
          })

          query.on('end', () => {
            t.transaction(txn)
            withRetry.release(client)
            t.ok(results, 'results should be received')
            txn.end()
            checkQueries(t, helper)
            t.end()
          })
        })
      })
    })

    t.test('database name should change with use statement', (t) => {
      helper.runInTransaction((txn) => {
        withRetry.getClient((err, client) => {
          if (!t.error(err)) {
            t.end()
            return
          }
          client.query('create database if not exists test_db;', (err) => {
            t.error(err, 'should not fail to create database')

            client.query('use test_db;', (err) => {
              t.error(err, 'should not fail to set database')

              client.query('SELECT 1 + 1 AS solution', (err) => {
                const currentSegment = contextManager.getContext()
                const seg = currentSegment && currentSegment.parent

                const attributes = seg.getAttributes()

                t.error(err)
                t.ok(seg, 'there is a segment')
                t.equal(attributes.host, utils.getDelocalizedHostname(params.host), 'set host')
                t.equal(attributes.database_name, 'test_db', 'set database name')
                t.equal(attributes.port_path_or_id, '3306', 'set port')
                withRetry.release(client)
                txn.end()
                checkQueries(t, helper)
                t.end()
              })
            })
          })
        })
      })
    })

    t.test(
      'query via execute() should be instrumented',
      { skip: pkgName === 'mysql' },
      function testTransaction(t) {
        helper.runInTransaction((txn) => {
          withRetry.getClient((err, client) => {
            t.error(err)

            t.transaction(txn)
            client.execute('SELECT 1', function (err) {
              t.error(err)

              t.transaction(txn)
              withRetry.release(client)
              txn.end()
              checkQueries(t, helper)
              t.end()
            })
          })
        })
      }
    )

    t.test('streaming query should be timed correctly', function testCB(t) {
      helper.runInTransaction((txn) => {
        withRetry.getClient((err, client) => {
          if (!t.error(err)) {
            t.end()
            return
          }

          t.transaction(txn)
          const query = client.query('SELECT SLEEP(1)', [])
          const start = Date.now()
          let duration = null
          let results = false
          let ended = false

          query.on('result', () => {
            results = true
          })

          query.on('error', (err) => {
            t.error(err)
            t.end()
          })

          query.on('end', () => {
            duration = Date.now() - start
            ended = true
          })

          setTimeout(function actualEnd() {
            txn.end()

            withRetry.release(client)
            t.ok(results && ended, 'result and end events should occur')
            const traceRoot = txn.trace.root
            const traceRootDuration = traceRoot.timer.getDurationInMillis()
            const segment = findSegment(traceRoot, 'Datastore/statement/MySQL/unknown/select')
            const queryNodeDuration = segment.timer.getDurationInMillis()
            t.ok(
              Math.abs(duration - queryNodeDuration) < 50,
              'query duration should be roughly be the time between query and end'
            )
            t.ok(
              traceRootDuration - queryNodeDuration > 900,
              'query duration should be small compared to transaction duration'
            )
            t.end()
          }, 2000)
        })
      })
    })

    t.test('streaming query children should nest correctly', function testCB(t) {
      helper.runInTransaction((txn) => {
        withRetry.getClient((err, client) => {
          if (!t.error(err)) {
            t.end()
            return
          }

          t.transaction(txn)
          const query = client.query('SELECT 1', [])

          query.on('result', () => setTimeout(() => {}, 10))

          query.on('error', (err) => {
            t.error(err)
            t.end()
          })

          query.on('end', function endCallback() {
            setTimeout(() => {
              txn.end()
              withRetry.release(client)
              const traceRoot = txn.trace.root
              const querySegment = traceRoot.children[0]
              t.equal(querySegment.children.length, 2, 'the query segment should have two children')

              const childSegment = querySegment.children[1]
              t.equal(childSegment.name, 'Callback: endCallback', 'children should be callbacks')
              const grandChildSegment = childSegment.children[0]
              t.equal(
                grandChildSegment.name,
                'timers.setTimeout',
                'grand children should be timers'
              )
              t.end()
            }, 100)
          })
        })
      })
    })

    t.test('query with options object rather than sql', (t) => {
      helper.runInTransaction((txn) => {
        withRetry.getClient((err, client) => {
          if (!t.error(err)) {
            t.end()
            return
          }

          t.transaction(txn)
          client.query({ sql: 'SELECT 1' }, (err) => {
            if (!t.error(err)) {
              t.end()
              return
            }

            t.transaction(txn)
            withRetry.release(client)
            txn.end()
            checkQueries(t, helper)
            t.end()
          })
        })
      })
    })

    t.test('query with options object and values', (t) => {
      helper.runInTransaction((txn) => {
        withRetry.getClient((err, client) => {
          if (!t.error(err)) {
            t.end()
            return
          }

          t.transaction(txn)
          client.query({ sql: 'SELECT 1' }, [], (err) => {
            if (!t.error(err)) {
              t.end()
              return
            }

            t.transaction(txn)
            withRetry.release(client)
            txn.end()
            checkQueries(t, helper)
            t.end()
          })
        })
      })
    })
  })
}

function findSegment(root, segmentName) {
  for (let i = 0; i < root.children.length; i++) {
    const segment = root.children[i]
    if (segment.name === segmentName) {
      return segment
    }
  }
  return null
}

function checkQueries(t, helper) {
  const querySamples = helper.agent.queries.samples
  t.ok(querySamples.size > 0, 'there should be a query sample')
  for (const sample of querySamples.values()) {
    t.ok(sample.total > 0, 'the samples should have positive duration')
  }
}
