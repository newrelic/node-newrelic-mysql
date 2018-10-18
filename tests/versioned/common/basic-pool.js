'use strict'

const exec = require('child_process').exec
const fs = require('fs')
const params = require('../../lib/params')
const setup = require('./setup')
const urltils = require('newrelic/lib/util/urltils') // TODO: Expose via test utilities
const utils = require('@newrelic/test-utilities')

const DBUSER = 'root'
const DBNAME = 'agent_integration'

var config = getConfig({})
function getConfig(extras) {
  var conf = {
    connectionLimit: 10,
    host: params.mysql_host,
    port: params.mysql_port,
    user: DBUSER,
    database: DBNAME
  }

  for (var key in extras) { // eslint-disable-line guard-for-in
    conf[key] = extras[key]
  }

  return conf
}

module.exports = (t, requireMySQL) => {
  t.test('See if mysql is running', (t) => {
    setup(requireMySQL(), (err) => {
      t.error(err, 'should not fail to set up mysql database')
      t.end()
    })
  })

  t.test('bad config', (t) => {
    t.autoend()

    let helper = utils.TestAgent.makeInstrumented()
    var mysql = requireMySQL(helper)
    var badConfig = {
      connectionLimit: 10,
      host: 'nohost',
      user: DBUSER,
      database: DBNAME
    }

    t.tearDown(() => {
      helper.unload()
    })

    t.test((t) => {
      var poolCluster = mysql.createPoolCluster()
      t.tearDown(() => poolCluster.end())

      poolCluster.add(badConfig) // anonymous group
      poolCluster.getConnection((err) => {
        // umm... so this test is pretty hacky, but i want to make sure we don't
        // wrap the callback multiple times.

        var stack = new Error().stack
        var frames = stack.split('\n').slice(3,8)

        t.notEqual(frames[0], frames[1], 'do not multi-wrap')
        t.notEqual(frames[0], frames[2], 'do not multi-wrap')
        t.notEqual(frames[0], frames[3], 'do not multi-wrap')
        t.notEqual(frames[0], frames[4], 'do not multi-wrap')

        t.ok(err, 'should be an error')
        t.end()
      })
    })
  })

  // TODO: test variable argument calling
  // TODO: test error conditions
  // TODO: test .query without callback
  // TODO: test notice errors
  // TODO: test sql capture
  t.test('mysql built-in connection pools', {timeout: 30 * 1000}, (t) => {
    var helper = null
    var mysql = null
    var pool = null

    t.beforeEach((done) => {
      helper = utils.TestAgent.makeInstrumented()
      mysql = requireMySQL(helper)
      pool = mysql.createPool(config)
      setup(mysql, done)
    })

    t.afterEach((done) => {
      helper.unload()
      pool.end(done)

      helper = null
      mysql = null
      pool = null
    })

    // make sure a connection exists in the pool before any tests are run
    // we want to make sure connections are allocated outside any transaction
    // this is to avoid tests that 'happen' to work because of how CLS works
    t.test('primer', (t) => {
      pool.query('SELECT 1 + 1 AS solution', (err) => {
        t.error(err, 'are you sure mysql is running?')
        t.end()
      })
    })

    t.test('ensure host and port are set on segment', (t) => {
      helper.runInTransaction((txn) => {
        pool.query('SELECT 1 + 1 AS solution', (err) => {
          let seg = txn.trace.root.children[0].children[1]
          // 2.16 introduced an extra segment
          if (seg && seg.name === 'timers.setTimeout') {
            seg = txn.trace.root.children[0].children[2]
          }
          t.error(err, 'should not error')
          t.ok(seg, 'should have a segment (' + (seg && seg.name) + ')')
          t.equal(
            seg.parameters.host,
            urltils.isLocalhost(config.host)
              ? helper.agent.config.getHostnameSafe()
              : config.host,
            'set host'
          )
          t.equal(
            seg.parameters.database_name,
            DBNAME,
            'set database name'
          )
          t.equal(
            seg.parameters.port_path_or_id,
            String(config.port),
            'set port'
          )
          txn.end(t.end)
        })
      })
    })

    t.test('respects `datastore_tracer.instance_reporting`', (t) => {
      helper.runInTransaction((txn) => {
        helper.agent.config.datastore_tracer.instance_reporting.enabled = false
        pool.query('SELECT 1 + 1 AS solution', (err) => {
          var seg = getDatastoreSegment(helper.agent.tracer.getSegment())
          t.error(err, 'should not error making query')
          t.ok(seg, 'should have a segment')

          t.notOk(
            seg.parameters.host,
            'should have no host parameter'
          )
          t.notOk(
            seg.parameters.port_path_or_id,
            'should have no port parameter'
          )
          t.equal(
            seg.parameters.database_name,
            DBNAME,
            'should set database name'
          )
          helper.agent.config.datastore_tracer.instance_reporting.enabled = true
          txn.end(t.end)
        })
      })
    })

    t.test('respects `datastore_tracer.database_name_reporting`', (t) => {
      helper.runInTransaction((txn) => {
        helper.agent.config.datastore_tracer.database_name_reporting.enabled = false
        pool.query('SELECT 1 + 1 AS solution', (err) => {
          var seg = getDatastoreSegment(helper.agent.tracer.getSegment())
          t.notOk(err, 'no errors')
          t.ok(seg, 'there is a segment')
          t.equal(
            seg.parameters.host,
            urltils.isLocalhost(config.host)
              ? helper.agent.config.getHostnameSafe()
              : config.host,
            'set host'
          )
          t.equal(
            seg.parameters.port_path_or_id,
            String(config.port),
            'set port'
          )
          t.notOk(
            seg.parameters.database_name,
            'should have no database name parameter'
          )
          helper.agent.config.datastore_tracer.database_name_reporting.enabled = true
          txn.end(t.end)
        })
      })
    })

    t.test('ensure host is the default (localhost) when not supplied', (t) => {
      var defaultConfig = getConfig({
        host: null
      })
      var defaultPool = mysql.createPool(defaultConfig)
      helper.runInTransaction((txn) => {
        defaultPool.query('SELECT 1 + 1 AS solution', (err) => {
          t.error(err, 'should not fail to execute query')

          // In the case where you don't have a server running on
          // localhost the data will still be correctly associated
          // with the query.
          var seg = getDatastoreSegment(helper.agent.tracer.getSegment())
          t.ok(seg, 'there is a segment')
          t.equal(
            seg.parameters.host,
            helper.agent.config.getHostnameSafe(),
            'set host'
          )
          t.equal(
            seg.parameters.database_name,
            DBNAME,
            'set database name'
          )
          t.equal(seg.parameters.port_path_or_id, String(defaultConfig.port), 'set port')
          txn.end(defaultPool.end.bind(defaultPool, t.end))
        })
      })
    })

    t.test('ensure port is the default (3306) when not supplied', (t) => {
      var defaultConfig = getConfig({
        host: null
      })
      var defaultPool = mysql.createPool(defaultConfig)
      helper.runInTransaction((txn) => {
        defaultPool.query('SELECT 1 + 1 AS solution', (err) => {
          var seg = getDatastoreSegment(helper.agent.tracer.getSegment())

          t.error(err, 'should not error making query')
          t.ok(seg, 'should have a segment')
          t.equal(
            seg.parameters.host,
            urltils.isLocalhost(config.host)
              ? helper.agent.config.getHostnameSafe()
              : config.host,
            'should set host'
          )
          t.equal(
            seg.parameters.database_name,
            DBNAME,
            'should set database name'
          )
          t.equal(
            seg.parameters.port_path_or_id,
            '3306',
            'should set port'
          )
          txn.end(defaultPool.end.bind(defaultPool, t.end))
        })
      })
    })

    t.test('query with error', (t) => {
      helper.runInTransaction((txn) => {
        pool.query('BLARG', (err) => {
          t.ok(err, 'should have errored')
          t.transaction(txn)
          txn.end(t.end)
        })
      })
    })

    t.test('lack of callback does not explode', (t) => {
      helper.runInTransaction((txn) => {
        pool.query('SET SESSION auto_increment_increment=1')
        txn.end(t.end)
      })
    })

    t.test('pool.query', (t) => {
      helper.runInTransaction((txn) => {
        pool.query('SELECT 1 + 1 AS solution123123123123', (err) => {
          var segment = helper.agent.tracer.getSegment().parent

          t.error(err, 'should not error')
          t.transaction(txn)
          checkSegment(t, segment, 'MySQL Pool#query')
          txn.end(t.end)
        })
      })
    })

    t.test('pool.query with values', (t) => {
      helper.runInTransaction((txn) => {
        pool.query('SELECT ? + ? AS solution', [1, 1], (err) => {
          t.error(err)
          if (t.transaction(txn)) {
            var segment = helper.agent.tracer.getSegment().parent
            checkSegment(t, segment, 'MySQL Pool#query')
          }

          txn.end(t.end)
        })
      })
    })

    t.test('pool.getConnection -> connection.query', (t) => {
      helper.runInTransaction((txn) => {
        pool.getConnection(function shouldBeWrapped(err, connection) {
          t.error(err, 'should not have error')
          t.transaction(txn)
          t.tearDown(() => connection.release())

          connection.query('SELECT 1 + 1 AS solution', (err) => {
            var segment = helper.agent.tracer.getSegment().parent

            t.error(err, 'no error ocurred')
            t.transaction(txn)
            checkSegment(t, segment)
            txn.end(t.end)
          })
        })
      })
    })

    t.test('pool.getConnection -> connection.query with values', (t) => {
      helper.runInTransaction((txn) => {
        pool.getConnection(function shouldBeWrapped(err, connection) {
          t.error(err, 'should not have error')
          t.transaction(txn)
          t.tearDown(() => connection.release())

          connection.query('SELECT ? + ? AS solution', [1,1], (err) => {
            t.error(err)
            if (t.transaction(txn)) {
              var segment = helper.agent.tracer.getSegment().parent
              checkSegment(t, segment)
            }

            txn.end(t.end)
          })
        })
      })
    })

    // The domain socket tests should only be run if there is a domain socket
    // to connect to, which only happens if there is a MySQL instance running on
    // the same box as these tests. This should always be the case on Travis,
    // but just to be sure they're running there check for the environment flag.
    getDomainSocketPath(function(socketPath) {
      var shouldTestDomain = socketPath || process.env.TRAVIS
      t.test(
        'ensure host and port are set on segment when using a domain socket',
        {skip: !shouldTestDomain},
        (t) => {
          var socketConfig = getConfig({
            socketPath: socketPath
          })
          var socketPool = mysql.createPool(socketConfig)
          helper.runInTransaction((txn) => {
            socketPool.query('SELECT 1 + 1 AS solution', (err) => {
              t.error(err, 'should not error making query')

              var seg = getDatastoreSegment(helper.agent.tracer.getSegment())

              // In the case where you don't have a server running on localhost
              // the data will still be correctly associated with the query.
              t.ok(seg, 'there is a segment')
              t.equal(
                seg.parameters.host,
                helper.agent.config.getHostnameSafe(),
                'set host'
              )
              t.equal(
                seg.parameters.port_path_or_id,
                socketPath,
                'set path'
              )
              t.equal(
                seg.parameters.database_name,
                DBNAME,
                'set database name'
              )
              txn.end(socketPool.end.bind(socketPool, t.end))
            })
          })
        }
      )

      t.end()
    })
  })

  t.test('poolCluster', {timeout: 30 * 1000}, (t) => {
    t.autoend()

    let helper = null
    let mysql = null

    t.beforeEach((done) => {
      helper = utils.TestAgent.makeInstrumented()
      mysql = requireMySQL(helper)
      setup(mysql, done)
    })

    t.afterEach((done) => {
      helper.unload()

      helper = null
      mysql = null

      done()
    })

    t.test('primer', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      poolCluster.getConnection((err, connection) => {
        t.error(err, 'should not be an error')
        t.notOk(helper.getTransaction(), 'transaction should not exist')

        connection.query('SELECT ? + ? AS solution', [1,1], (err) => {
          t.error(err)
          t.notOk(helper.getTransaction(), 'transaction should not exist')

          connection.release()
          poolCluster.end()
          t.end()
        })
      })
    })

    t.test('get any connection', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      helper.runInTransaction((txn) => {
        poolCluster.getConnection((err, connection) => {
          t.error(err, 'should not have error')
          t.transaction(txn)

          txn.end()
          connection.release()
          poolCluster.end()
          t.end()
        })
      })
    })

    t.test('get any connection', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      poolCluster.getConnection((err, connection) => {
        t.error(err, 'should not have error')

        helper.runInTransaction((txn) => {
          connection.query('SELECT ? + ? AS solution', [1,1], (err) => {
            t.error(err, 'no error ocurred')
            if (t.transaction(txn)) {
              var segment = helper.agent.tracer.getSegment().parent
              checkSegment(t, segment)
            }

            txn.end()
            connection.release()
            poolCluster.end()
            t.end()
          })
        })
      })
    })

    t.test('get MASTER connection', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      helper.runInTransaction((txn) => {
        poolCluster.getConnection('MASTER', (err, connection) => {
          t.error(err)
          t.transaction(txn)

          txn.end()
          connection.release()
          poolCluster.end()
          t.end()
        })
      })
    })


    t.test('get MASTER connection', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      poolCluster.getConnection('MASTER', (err, connection) => {
        helper.runInTransaction((txn) => {
          connection.query('SELECT ? + ? AS solution', [1, 1], (err) => {
            t.error(err)
            if (t.transaction(txn)) {
              var segment = helper.agent.tracer.getSegment().parent
              checkSegment(t, segment)
            }

            txn.end()
            connection.release()
            poolCluster.end()
            t.end()
          })
        })
      })
    })

    t.test('get glob', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      helper.runInTransaction((txn) => {
        poolCluster.getConnection('REPLICA*', 'ORDER', (err, connection) => {
          t.error(err)
          t.transaction(txn)

          txn.end()
          connection.release()
          poolCluster.end()
          t.end()
        })
      })
    })

    t.test('get glob', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      poolCluster.getConnection('REPLICA*', 'ORDER', (err, connection) => {
        helper.runInTransaction((txn) => {
          connection.query('SELECT ? + ? AS solution', [1,1], (err) => {
            t.error(err)
            if (t.transaction(txn)) {
              var segment = helper.agent.tracer.getSegment().parent
              checkSegment(t, segment)
            }

            txn.end()
            connection.release()
            poolCluster.end()
            t.end()
          })
        })
      })
    })

    t.test('get star', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      helper.runInTransaction((txn) => {
        poolCluster.of('*').getConnection((err, connection) => {
          t.error()
          t.transaction(txn)

          txn.end()
          connection.release()
          poolCluster.end()
          t.end()
        })
      })
    })

    t.test('get star', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      poolCluster.of('*').getConnection((err, connection) => {
        helper.runInTransaction((txn) => {
          connection.query('SELECT ? + ? AS solution', [1,1], (err) => {
            t.error(err)
            if (t.transaction(txn)) {
              var segment = helper.agent.tracer.getSegment().parent
              checkSegment(t, segment)
            }

            txn.end()
            connection.release()
            poolCluster.end()
            t.end()
          })
        })
      })
    })

    t.test('get wildcard', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      helper.runInTransaction((txn) => {
        var pool = poolCluster.of('REPLICA*', 'RANDOM')
        pool.getConnection((err, connection) => {
          t.error(err)
          t.transaction(txn)

          txn.end()
          connection.release()
          poolCluster.end()
          t.end()
        })
      })
    })

    t.test('get wildcard', (t) => {
      var poolCluster = mysql.createPoolCluster()

      poolCluster.add(config) // anonymous group
      poolCluster.add('MASTER', config)
      poolCluster.add('REPLICA', config)

      var pool = poolCluster.of('REPLICA*', 'RANDOM')
      pool.getConnection((err, connection) => {
        helper.runInTransaction((txn) => {
          connection.query('SELECT ? + ? AS solution', [1,1], (err) => {
            t.error(err)
            if (t.transaction(txn)) {
              var segment = helper.agent.tracer.getSegment().parent
              checkSegment(t, segment)
            }

            txn.end()
            connection.release()
            poolCluster.end()
            t.end()
          })
        })
      })
    })
  })
}

function getDomainSocketPath(callback) {
  exec('mysql_config --socket', (err, stdout, stderr) => {
    if (err || stderr.toString()) {
      callback(null)
      return
    }

    var sock = stdout.toString().trim()
    fs.access(sock, (err) => {
      callback(err ? null : sock)
    })
  })
}

function getDatastoreSegment(segment) {
  return segment.parent.children.filter((s) => /^Datastore/.test(s && s.name))[0]
}

function checkSegment(t, segment, name) {
  name = name || 'Datastore/statement/MySQL/unknown/select'

  t.ok(segment, 'segment should exist')
  t.ok(segment.timer.start > 0, 'should start at a postitive time')
  t.ok(segment.timer.start <= Date.now(), 'should start in past')
  t.equal(segment.name, name, 'should be named')
}
