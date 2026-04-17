//TODO
/// <reference lib="webworker" />

import { SW } from "../library/sw/sw";
import { CUSTOM_HEADER } from "./const";

const serviceWorker = new SW(CUSTOM_HEADER);
serviceWorker.initializeSW();
