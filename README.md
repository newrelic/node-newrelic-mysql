[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

# New Relic MySQL instrumentation
[![npm status badge][5]][6] [![mysql instrumentation CI][1]][2] [![codecov][7]][8]

New Relic's offical MySQL instrumentation for use with the New Relic [Node.js
agent](https://github.com/newrelic/node-newrelic).

## Installation and Getting Started

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

Our [API and developer documentation](http://newrelic.github.io/node-newrelic/) for writing
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


Should you need assistance with New Relic products, you are in good hands with several support channels.

**Support Channels**

* [New Relic Documentation](https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/introduction-new-relic-nodejs): Comprehensive guidance for using our platform
* [New Relic Community](https://discuss.newrelic.com/tags/nodeagent): The best place to engage in troubleshooting questions
* [New Relic Developer](https://developer.newrelic.com/): Resources for building a custom observability applications
* [New Relic University](https://learn.newrelic.com/): A range of online training for New Relic users of every level

## Privacy

At New Relic we take your privacy and the security of your information seriously, and are
committed to protecting your information. We must emphasize the importance of not sharing
personal data in public forums, and ask all users to scrub logs and diagnostic information
for sensitive information, whether personal, proprietary, or otherwise.

We define "Personal Data" as any information relating to an identified or identifiable
individual, including, for example, your name, phone number, post code or zip code,
Device ID, IP address and email address.

For more information, review [New Relic’s General Data Privacy Notice](https://newrelic.com/termsandconditions/privacy).

## Roadmap
See our [roadmap](https://github.com/newrelic/node-newrelic/blob/main/ROADMAP_Node.md), to learn more about our product vision,
understand our plans, and provide us valuable feedback. Remove this section if it’s not needed.

## Contribute

We encourage your contributions to improve New Relic MySQL instrumentation!  Keep in mind
when you submit your pull request, you'll need to sign the CLA via the click-through using
CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA, required if your contribution
is on behalf of a company,  please drop us an email at opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](https://github.com/newrelic/node-newrelic-mysql/security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's
products or websites, we welcome and greatly appreciate you reporting it to New Relic
through [HackerOne](https://hackerone.com/newrelic).

If you would like to contribute to this project, please review [these guidelines](https://github.com/newrelic/node-newrelic-mysql/blob/main/CONTRIBUTING.md).

To [all contributors](https://github.com/newrelic/node-newrelic-mysql/graphs/contributors),we thank you!  Without your contribution, this project would not be what it is today. We also host a community project page dedicated to
[the New Relic MySql Instrumentation package](https://opensource.newrelic.com/newrelic/node-newrelic-mysql).

## License

New Relic MySQL instrumentation is licensed under the [Apache
2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

New Relic MySQL instrumentation also uses source code from third-party libraries. You can find full details on which libraries are used and the terms under which they are licensed in the third-party notices document.

[1]: https://github.com/newrelic/node-newrelic-mysql/workflows/mysql%20Instrumentation%20CI/badge.svg
[2]: https://github.com/newrelic/node-newrelic-mysql/actions
[3]: https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent
[4]: https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent
[5]: https://img.shields.io/npm/v/@newrelic/mysql.svg
[6]: https://www.npmjs.com/package/@newrelic/mysql
[7]: https://codecov.io/gh/newrelic/node-newrelic-mysql/branch/main/graph/badge.svg?token=QUFKIFMGO5
[8]: https://codecov.io/gh/newrelic/node-newrelic-mysql