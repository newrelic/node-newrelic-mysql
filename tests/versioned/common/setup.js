/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const async = require('async')

module.exports = exports = setup
exports.pool = setupPool
const params = (exports.params = {
  host: process.env.NR_NODE_TEST_MYSQL_HOST || 'localhost',
  port: process.env.NR_NODE_TEST_MYSQL_PORT || 3306,
  user: 'test_user',
  database: 'agent_integration_' + Math.floor(Math.random() * 1000)
})

function executeDb(client, sql) {
  return new Promise((resolve, reject) => {
    client.query(sql, (err) => {
      if (err) {
        reject(err)
      }
      resolve()
    })
  })
}

async function setupDb(mysql) {
  const client = mysql.createConnection({
    host: params.mysql_host,
    port: params.mysql_port,
    user: 'root',
    database: 'mysql'
  })

  await async.eachSeries(
    [
      `CREATE USER If NOT EXISTS ${params.user}`,
      `GRANT ALL ON *.* TO ${params.user}`,
      `CREATE DATABASE IF NOT EXISTS ${params.database}`
    ],
    async (sql) => {
      await executeDb(client, sql)
    }
  )
  client.end()
}

async function setupTable(mysql) {
  const client = mysql.createConnection(params)

  await async.eachSeries(
    [
      [
        'CREATE TABLE IF NOT EXISTS `test` (',
        '  `id`         INTEGER(10) PRIMARY KEY AUTO_INCREMENT,',
        '  `test_value` VARCHAR(255)',
        ')'
      ].join('\n'),
      'TRUNCATE TABLE `test`',
      'INSERT INTO `test` (`test_value`) VALUE ("hamburgefontstiv")'
    ],
    async (sql) => {
      await executeDb(client, sql)
    }
  )
  client.end()
}

async function setup(mysql) {
  await setupDb(mysql)
  await setupTable(mysql)
}

function setupPool(mysql) {
  const generic = require('generic-pool')

  /* eslint-disable no-console */
  const pool = new generic.Pool({
    name: 'mysql',
    min: 2,
    max: 6,
    idleTimeoutMillis: 250,

    create: (callback) => {
      const client = mysql.createConnection(params)

      client.on('error', (err) => {
        console.error('MySQL connection errored out, destroying connection')
        console.error(err)
        pool.destroy(client)
      })

      client.connect((err) => {
        if (err) {
          console.error('MySQL client failed to connect. Does `agent_integration` exist?')
        }

        callback(err, client)
      })
    },

    destroy: (client) => {
      console.info('Destroying MySQL connection')
      client.end()
    }
  })
  /* eslint-enable no-console */

  return pool
}
