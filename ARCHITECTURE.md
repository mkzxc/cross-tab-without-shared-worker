# Terminology

Internally, **Worker** is also named _**DW**_ to create symmetry with the **Service Worker** abbreviation.

# ARCHITECTURE

_(Notes about refactor)_
Differentiate lifecycle logic and _fetch_ handling logic to achieve:

- primarily an agnostic architecture of the library
- secondarily a better encapsulation of the logic of the various building blocks and layers to aim for a better separation of responsibility
- tertiarily (I've never read this term XD) an easier implementation of the library

## Tab

This file is responsible for bootstrapping the **Service Worker**, the **Worker** and to handle recovery.\
It holds a reference to the **Worker**, so it pings it to verify that its actually alive.\
The creation of the **Worker** is handled via a Lock named _create-dw-lock_.\
It creates a _MessageChannel_, the **Worker** will receive a port via _SW_PORT_ while the **Service Worker** will receive the **Worker** port via _WORKER_PORT_: at that point **Service Worker** and **Worker** can communicate directly and the tab is not needed.\
At the end of the setup, sends _TAB_READY_ so the **Service Worker** knows that it can handle a possible recovery (_CREATE_WORKER_ and _RESEND_PORT_).

## Service Worker

Intercepts fetches and handles the ones with the _X-Key_ Header to the **Gateway**.

### Services

Encapsulates logic around a domain problem:

- **TabsService** knows about active Tabs and notifies them if something happened
- **DWService** handles the communication lifecycle with the **Worker** spawned by the elected Tab

### Gateway

Acts as a bridge between the **Service Worker** and the **Worker** for the custom operations via the _custom-operation-lock_ Lock.

## Adapters

### WorkerAdapter

Shapes event handlers so that they fit into library architecture, receives its port via _SW_PORT_ and answers to a possible _PING_.\
Must be used in the **Worker** file to handle the messages from the **Service Worker**.
