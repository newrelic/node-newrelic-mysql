[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

# New Relic MySQL instrumentation [![mysql instrumentation CI][1]][2]

New Relic's offical MySQL instrumentation for use with the New Relic [Node.js
agent](https://github.com/newrelic/node-newrelic).

## Installation and getting started

This module is a dependency of the agent and is installed with it by running:

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

For more information, please see the agent [installation guide][3] and the agent [compatibility and
requirements][4].

Our [API and developer documentation](http://newrelic.github.io/node-newrelic/docs/) for writing
instrumentation will be of help. We particularly recommend the tutorials and various "shim" API
documentation.

## Testing

The module includes a suite of functional tests which should be used to verify that your changes
don't break existing functionality.

These tests rely on a Docker container being setup via scripts in the [Node.js
agent](https://github.com/newrelic/node-newrelic). This container can be setup by running `npm run
services` in the main agent repo.

All tests are stored in `tests/` and are written using [Tap](https://www.npmjs.com/package/tap) with
the extension `.tap.js`.

To run the full suite, run: `npm test`.

## Support

New Relic hosts and moderates an online forum where you can interact with New Relic employees as
well as other customers to get help and share best practices. Like all official New Relic open
source projects, there's a related Community topic in the New Relic Explorers Hub. You can find this
project's topic/threads here: https://discuss.newrelic.com/c/support-products-agents/node-js-agent/.

## Contributing
We encourage your contributions to improve New Relic MySQL instrumentation!  Keep in mind when you
submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You
only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA, required if your contribution is on
behalf of a company,  please drop us an email at opensource@newrelic.com.

## License
New Relic MySQL instrumentation is licensed under the [Apache
2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

New Relic MySQL instrumentation also uses source code from third-party libraries. You can find full
details on which libraries are used and the terms under which they are licensed in the third-party
notices document.

[1]: https://github.com/newrelic/node-newrelic-mysql/workflows/mysql%20Instrumentation%20CI/badge.svg
[2]: https://github.com/newrelic/node-newrelic-mysql/actions
[3]: https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent
[4]: https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent
