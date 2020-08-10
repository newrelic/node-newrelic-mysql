### 4.0.0 (2020-08-10):

* Updated to Apache 2.0 license.
* Bumped minimum peer dependency (and dev dependency) of newrelic (agent) to 6.11 for license matching.
* Added third party notices file and metadata for dependencies.
* Updated README with more detail.
* Added issue templates for bugs and enhancements.
* Added code of conduct file.
* Added contributing guide.
* Added pull request template.
* Migrated CI to GitHub Actions.
* Added copyright headers to all source files.

### 3.0.0 (2019-10-30)

* **BREAKING** Removed support for Node 6, 7, and 9.

  The minimum supported version is now Node v8. For further information on our support policy, see: https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent.

* Added support for Node v12.

* Bumps `tap` to latest major version.

* Bumps minimum required `newrelic` version to `6.0.0` for Node 12 compatible fixes.

### 2.0.0 (2019-05-30)

* Updates tests to make agent v5 compatible.

* Bumps `newrelic` dependency minimum to `5.9.1` which includes critical fix for this module to load for `mysql2/promise`.

* Reorganizes promises test to expose bug that is fixed in agent version `5.9.1`.

* Enforces supported Node versions (aligns with agent).

* Fixes bug with `mysql2/promise` where underlying callback instrumentation would look at the wrong query arg for the callback.

### 1.0.2 (2018-11-14)

* Replaced deep-link into agent to retrieve database name with call to
  `shim.getDatabaseNameFromUseQuery()`.

* Removed more items from the published package.

### 1.0.1 (2018-10-30)

* Updated test utilities library and stopped deep linking into the agent.

### 1.0.0 (2018-10-26)

* Initial release of `mysql` and `mysql2` instrumentation as a separate module.

  Ports the MySQL instrumentation packaged with the agent to an external module.

* Fixed instrumentation of `mysql2/promise`.
