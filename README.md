[![Coverage Status][1]][2]

New Relic's official MySQL instrumentation for use with the
[Node agent](https://github.com/newrelic/node-newrelic). This module is a
dependency of the agent and is installed with it by running:

```
npm install newrelic
```

Alternatively, it can be installed and loaded independently based on specific
versioning needs:

```
npm install @newrelic/mysql
```
```js
// index.js
require('@newrelic/mysql')
```

### Supported modules

- [`mysql`](https://www.npmjs.com/package/mysql)
- [`mysql2`](https://www.npmjs.com/package/mysql2)

For more information, please see the agent [installation guide][3], and
[compatibility and requirements][4].

[1]: https://coveralls.io/repos/github/newrelic/node-newrelic-mysql/badge.svg?branch=master
[2]: https://coveralls.io/github/newrelic/node-newrelic-mysql?branch=master
[3]: https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent
[4]: https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent
