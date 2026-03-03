## LIFECYCLE

I'll try to describe more in depth the lifecycle of the interactions between Tabs, SW and DW in the case of setup and recovery.

The cases to account for are:

- Tab closed
- [SW terminated](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle#idle-shutdown)
- DW dies due to Tab refresh

### Normal bootstrap

setup() runs
Registers SW and waits for its activation
Tab will sends **HAS_WORKER** to the SW which will return _{hasWorker: false}_.
DW not available so it requests **worker_create_lock** and saves a reference of the newly created DW
Creates a _MessageChannel_ and forwards the ports so SW (**WORKER_PORT**) and DW(**SW_PORT**) can communicate directly.
SW will store the _workerPort_ and _workerOwnerClientId_ and sends **PORT_READY** to the Tab.
This Tab (and every newly opened one) sends **TAB_READY** to the SW and the SW will add its id.

### Tab that owns the DW closes but SW is running

_ensurePortIsReady_ starts the recovery of the DW by resetting the data related to the port and owner id.
The first element of (updated) readyTabs will be the elected client which will tasked by the SW to **CREATE_WORKER** or to **RESEND_PORT**.
_workerReadyResolve_ will be called only once the worker port and owner will be correctly set, and the related promise will be reset to null.
To make sure that there's only one attempt to recover the DW and that there's no interaction with the DW if it's not ready, all the intercepted fetches will have to wait the same _workerRecoveryPromise_.

### Multiple Tabs opening at the same time

The **worker_create_lock** makes sure that only the first Tab is elected to the be the owner, when the others acquire the Lock they will receive _{ hasWorker: true}_ from the SW.

### SW terminated

TODO

### SW-DB communications errors

TODO
