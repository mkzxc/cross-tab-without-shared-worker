# Goal

Differentiate lifecycle logic and fetch handling logic to achieve

- primarily an agnostic architecture of the library
- secondarily a better encapsulation of the logic of the various building blocks and layers
- tertiarily (I've never read this term XD) a clearer separation of responsability

## SW

### Services

Encapsulate logic around a domain problem:

- **TabsService** knows about active Tabs and notifies them if something happened
- **DWService** handles the communication lifecycle with the Dedicated Worker spawned by the elected Tab

### Gateway

Acts as a bridge between the SW and the DW for the custom operations

## Adapters

### MessageHandlerAdapter

Shapes user data handler so that it fits into library architecture

### ActionsAdapter

Inject custom configs to handle different stages of an operation
The key is essential to differentiating configs for both internal and external use

## Tab

Same responsabilities of before but now takes a Provider as an argument to allow for custom defined behavior on the completion of an operation
