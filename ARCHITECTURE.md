## ARCHITECTURE

### Tabs (main.ts)

This file is responsible for bootstrapping the SW and to handle recovery.\
It holds a reference to the DW, so it pings it to verify that its actually alive.\
The creation of the DW is handled via a Lock named **worker-create-lock**.\
It creates a _MessageChannel_, the DW will receive a port via **SW_PORT** while the SW will receive the DW port via **WORKER_PORT**: at that point SW and DW can communicate directly and the tab is not needed.\
At the end of the setup, sends **TAB_READY** so the SW knows that it can handle a possible recovery (**CREATE_WORKER** and **RESEND_PORT**).

### Dedicated Worker (db.worker.ts)

Its job is to initialize and interact with the DB.\
Receives its port via **SW_PORT** and answers to a possible **PING**.

### Service Worker (src/sw.ts)

Entry point that uses the methods exposed by the managers to intercept every fetch and map them to the related method, listens for the tabs, makes sure of the state of the DW and the related port.

#### Tabs Manager (src/sw-tabs-manager.ts)

readyTabs contains the tabs that have completed the bootstrap and that are actually available.\
Only the first found tab will be the one handling the DW Recovery and will send the appropriate message to the SW.\
It exposes _notifyAllTabs_ to notify the other tabs via **DB_UPDATED**.

#### DW Manager (src/sw-dw-manager.ts)

It manages the state of the DW, which tab owns it and handles the recovery of it.\
_ensurePortIsReady_ must be called before every request to the DW to make sure of its state.

#### DB Manager (src/sw-db-manager.ts)

Exposes two methods that acquire a Lock named **db-lock** and handle the limited available operations of INSERT and SELECT mapping them to the available _SWToDWMessage_.

### Concurrency

There are two possible Locks:

- **worker-create-lock** makes sure that only one DW is ever created.
- **db-lock** prevents corruption of DB.

As of right now, they are both exclusive: probably a shared lock could be granted in case of reading operations.
