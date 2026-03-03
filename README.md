## WHY THIS PROJECT?

There was an attempt in [Pillage First](https://github.com/jurerotar/Pillage-First-Ask-Questions-Later) to implement a feature to let users open the same game world in multiple tabs or browser windows.
Since data is actually stored on the device, a [Lock](https://developer.mozilla.org/en-US/docs/Web/API/Lock) must be maintained.

**Shared Worker** can't be used for two reasons:

- There's no support in Android Chrome ([see Chromium issue 40290702](https://issues.chromium.org/issues/40290702)).
- It can't use _createSyncAccessHandle_, which is needed to use SQLite OPFS SAHPool VFS.

A **BroadcastChannel** implementation needs a custom made implementation of a Lock, which leaves doors open to concurrency problems.
On top of that, the react-query-broadcast-client is itself experimental.

This project is an attempt to solve these issues by splitting the responsabilities of the Lock and the interaction with the DB, by using respectively a **Service Worker** and a **Dedicated Worker**:

- The SW is available to every tab and only one tab creates the DW that can interact with the DB
- The SW acts as a controller for the tabs and handles the negotiation thanks to its access to the Lock
- SW and DW communicate via **MessageChannel**

This project can't be even classified as prototype of a POC, so it surely has architecture problems, bugs and the opposite of state of the art solutions: very bad decisions were taken in order to test something.
The purpose is to first prove its functionality and then refactor it nicely in a package that can be used in various codebases.
