'use strict'

const async = require('async')


module.exports = exports = setup
exports.pool = setupPool
const params = exports.params = {
  host: process.env.NR_NODE_TEST_MYSQL_HOST || 'localhost',
  port: process.env.NR_NODE_TEST_MYSQL_PORT || 3306,
  user: 'test_user',
  database: 'agent_integration_' + Math.floor(Math.random() * 1000)
}

function setup(mysql, cb) {
  async.series([
    // 1. Create the user and database as root.
    (cb) => {
      var client = mysql.createConnection({
        host: params.mysql_host,
        port: params.mysql_port,
        user: 'root',
        database: 'mysql'
      })

      async.eachSeries([
        `CREATE USER ${params.user}`,
        `GRANT ALL ON *.* TO ${params.user}`,
        `CREATE DATABASE IF NOT EXISTS ${params.database}`
      ], (sql, cb) => {
        client.query(sql, (err) => {
          // Travis uses MySQL 5.4 which does not support `IF NOT EXISTS` for
          // `CREATE USER`. This means we will likely be creating the test user
          // in a database that already has the test user and so we should
          // ignore that error.
          if (err && !/^CREATE USER/.test(sql)) {
            cb(err)
          } else {
            cb()
          }
        })
      }, (err) => {
        client.end()
        cb(err)
      })
    },

    // 2. Create the table and data as test user.
    (cb) => {
      var client = mysql.createConnection(params)

      async.eachSeries([
        [
          'CREATE TABLE IF NOT EXISTS `test` (',
          '  `id`         INTEGER(10) PRIMARY KEY AUTO_INCREMENT,',
          '  `test_value` VARCHAR(255)',
          ')'
        ].join('\n'),
        'TRUNCATE TABLE `test`',
        'INSERT INTO `test` (`test_value`) VALUE ("hamburgefontstiv")'
      ], (sql, cb) => {
        client.query(sql, cb)
      }, (err) => {
        client.end()
        cb(err)
      })
    }
  ], cb)
}

function setupPool(mysql, logger) {
  var generic = require('generic-pool')

  var pool = new generic.Pool({
    name: 'mysql',
    min: 2,
    max: 6,
    idleTimeoutMillis: 250,

    log: (message) => logger.info(message),

    create: (callback) => {
      var client = mysql.createConnection(params)

      client.on('error', (err) => {
        logger.error('MySQL connection errored out, destroying connection')
        logger.error(err)
        pool.destroy(client)
      })

      client.connect((err) => {
        if (err) {
          logger.error('MySQL client failed to connect. Does `agent_integration` exist?')
        }

        callback(err, client)
      })
    },

    destroy: (client) => {
      logger.info('Destroying MySQL connection')
      client.end()
    }
  })

  return pool
}
