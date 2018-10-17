'use strict'

module.exports = {
  mysql_host: process.env.NR_NODE_TEST_MYSQL_HOST || 'localhost',
  mysql_port: process.env.NR_NODE_TEST_MYSQL_PORT || 3306
}
