'use strict'

const logger = require('newrelic/lib/logger')
const setup = require('./setup')
const tap = require('tap')
const utils = require('@newrelic/test-utilities')


const DBNAME = 'agent_integration'
const DBTABLE = 'test'


utils(tap)

tap.test('MySQL instrumentation with a connection pool', {timeout: 30000}, (t) => {
  let helper = utils.TestAgent.makeInstrumented()
  helper.registerInstrumentation({
    moduleName: 'mysql',
    type: 'datastore',
    onRequire: require('../../../lib/instrumentation').callbackInitialize
  })
  let mysql = require('mysql')
  let poolLogger = logger.child({component: 'pool'})
  let pool = setup.pool(mysql, poolLogger)

  t.tearDown(() => {
    pool.drain(() => {
      pool.destroyAllNow()
      helper.unload()
    })
  })

  var withRetry = {
    getClient: (callback, counter) => {
      if (!counter) {
        counter = 1
      }
      counter++

      pool.acquire((err, client) => {
        if (err) {
          poolLogger.error('Failed to get connection from the pool: %s', err)

          if (counter < 10) {
            pool.destroy(client)
            withRetry.getClient(callback, counter)
          } else {
            callback(new Error('Couldn\'t connect to DB after 10 attempts.'))
          }
        } else {
          callback(null, client)
        }
      })
    },

    release: function(client) {
      pool.release(client)
    }
  }

  var dal = {
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

        var query =
          'SELECT *' +
          '  FROM ' + DBNAME + '.' + DBTABLE +
          ' WHERE id = ?'
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

  setup(mysql, function(err) {
    t.error(err)
    t.notOk(helper.getTransaction(), 'no transaction should be in play yet')
    helper.runInTransaction((txn) => {
      var context = {
        id: 1
      }
      dal.lookup(context, (error, row) => {
        if (!t.error(err) || !t.transaction(txn)) {
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

          t.equals(row.id, 1, 'node-mysql should still work (found id)')
          t.equals(row.test_value, 'hamburgefontstiv',
                   'mysql driver should still work (found value)')

          txn.end()

          var trace = txn.trace
          t.ok(trace, 'trace should exist')
          t.ok(trace.root, 'root element should exist.')
          t.equals(trace.root.children.length, 1, 'There should be only one child.')

          var selectSegment = trace.root.children[0]
          t.ok(selectSegment, 'trace segment for first SELECT should exist')
          t.equals(
            selectSegment.name,
            'Datastore/statement/MySQL/agent_integration.test/select',
            'should register as SELECT'
          )

          t.equals(selectSegment.children.length, 1, 'should have a callback segment')
          t.equals(selectSegment.children[0].name, 'Callback: <anonymous>')

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
