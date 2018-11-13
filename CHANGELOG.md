
### 1.0.2 (2018-11-14):

* Replaced deep-link into agent to retrieve database name with call to
  `shim.getDatabaseNameFromUseQuery()`.

* Removed more items from the published package.

### 1.0.1 (2018-10-30):

* Updated test utilities library and stopped deep linking into the agent.

### 1.0.0 (2018-10-26):

* Initial release of `mysql` and `mysql2` instrumentation as a separate module.

  Ports the MySQL instrumentation packaged with the agent to an external module.

* Fixed instrumentation of `mysql2/promise`.
