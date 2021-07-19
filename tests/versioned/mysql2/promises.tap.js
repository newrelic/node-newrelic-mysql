/*
* Copyright 2020 New Relic Corporation. All rights reserved.
* SPDX-License-Identifier: Apache-2.0
*/

'use strict'

const setup = require('../common/setup')
const tap = require('tap')
const utils = require('@newrelic/test-utilities')

const params = setup.params


utils(tap)

tap.test('mysql2 promises', {timeout: 30000}, (t) => {
  t.autoend()

  let helper = null
  let mysql = null
  let client = null

  t.beforeEach(async() => {
    await setup(require('mysql2'))

    // It is important to keep this setup code to trigger
    // certain potential error cases with module resolution.

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

    client = await mysql.createConnection(params)
  })

  t.afterEach(async() => {
    helper.unload()
    if (client) {
      await client.end()
      client = null
    }
  })

  t.test('basic transaction', (t) => {
    return helper.runInTransaction((tx) => {
      return client.query('SELECT 1').then(() => {
        t.transaction(tx)
        tx.end()
      })
    }).then(() => checkQueries(t, helper))
  })

  t.test('query with values', (t) => {
    return helper.runInTransaction((tx) => {
      return client.query('SELECT 1', []).then(() => {
        t.transaction(tx)
        tx.end()
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
        const attributes = segment.getAttributes()
        t.equal(
          attributes.host,
          utils.getDelocalizedHostname(params.host),
          'should set host name'
        )
        t.equal(attributes.database_name, 'test_db', 'should follow use statement')
        t.equal(attributes.port_path_or_id, '3306', 'should set port')

        tx.end()
      })
    }).then(() => checkQueries(t, helper))
  })

  t.test('query with options object rather than sql', (t) => {
    return helper.runInTransaction((tx) => {
      return client.query({sql: 'SELECT 1'}).then(() => tx.end())
    }).then(() => checkQueries(t, helper))
  })

  t.test('query with options object and values', (t) => {
    return helper.runInTransaction((tx) => {
      return client.query({sql: 'SELECT 1'}, []).then(() => tx.end())
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
