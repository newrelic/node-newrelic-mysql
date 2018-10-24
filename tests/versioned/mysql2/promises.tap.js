'use strict'

const setup = require('../common/setup')
const tap = require('tap')
const urltils = require('newrelic/lib/util/urltils') // TODO: Expose via test utilities
const utils = require('@newrelic/test-utilities')

const params = setup.params
const DBUSER = 'test_user'
const DBNAME = 'agent_integration'


utils(tap)

tap.test('mysql2 promises', {timeout: 30000}, (t) => {
  t.autoend()

  let helper = null
  let mysql = null
  let client = null

  t.beforeEach((done) => {
    helper = utils.TestAgent.makeInstrumented()

    // Stub the normal mysql2 instrumentation to avoid it hiding issues with the
    // promise instrumentation.
    helper.registerInstrumentation({
      moduleName: 'mysql2',
      type: 'datastore',
      onRequire: () => {}
    })

    helper.registerInstrumentation({
      moduleName: 'mysql2/promise',
      type: 'datastore',
      onRequire: require('../../../lib/instrumentation').promiseInitialize
    })
    mysql = require('mysql2/promise')

    // Perform the setup using the callback API.
    setup(require('mysql2'), (err) => {
      if (err) {
        done(err)
      } else {
        mysql.createConnection({
          user: DBUSER,
          databsae: DBNAME,
          host: params.mysql_host,
          port: params.mysql_port
        }).then((c) => {client = c; done()}, done)
      }
    })
  })

  t.afterEach((done) => {
    helper.unload()
    if (client) {
      client.end().then(done, done)
      client = null
    } else {
      done()
    }
  })

  t.test('basic transaction', (t) => {
    return helper.runInTransaction((tx) => {
      return client.query('SELECT 1').then(() => {
        t.transaction(tx)
        return endAsync(tx)
      })
    }).then(() => checkQueries(t, helper))
  })

  t.test('query with values', (t) => {
    return helper.runInTransaction((tx) => {
      return client.query('SELECT 1', []).then(() => {
        t.transaction(tx)
        return endAsync(tx)
      })
    }).then(() => checkQueries(t, helper))
  })

  t.test('database name should change with use statement', (t) => {
    return helper.runInTransaction((tx) => {
      return client.query('create database if not exists test_db').then(() => {
        t.transaction(tx)
        return client.query('use test_db')
      }).then(() => {
        t.transaction(tx)
        return client.query('SELECT 1 + 1 AS solution')
      }).then(() => {
        t.transaction(tx)

        const segment = tx.trace.root.children[2]
        const parameters = segment.parameters
        t.equal(parameters.host, getHostName(helper), 'should set host name')
        t.equal(parameters.database_name, 'test_db', 'should follow use statement')
        t.equal(parameters.port_path_or_id, '3306', 'should set port')

        return endAsync(tx)
      })
    }).then(() => checkQueries(t, helper))
  })

  t.test('query with options object rather than sql', (t) => {
    return helper.runInTransaction((tx) => {
      return client.query({sql: 'SELECT 1'}).then(() => endAsync(tx))
    }).then(() => checkQueries(t, helper))
  })

  t.test('query with options object and values', (t) => {
    return helper.runInTransaction((tx) => {
      return client.query({sql: 'SELECT 1'}, []).then(() => endAsync(tx))
    }).then(() => checkQueries(t, helper))
  })
})

function checkQueries(t, helper) {
  const querySamples = helper.agent.queries.samples
  t.ok(querySamples.size > 0, 'there should be a query sample')
  for (let sample of querySamples.values()) {
    t.ok(sample.total > 0, 'the samples should have positive duration')
  }
}

function endAsync(tx) {
  return new Promise((resolve) => tx.end(() => resolve()))
}

function getHostName(helper) {
  return urltils.isLocalhost(params.mysql_host)
    ? helper.agent.config.getHostnameSafe()
    : params.mysql_host
}
