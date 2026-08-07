"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fridayReminder = exports.dailyAyah = void 0;
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
var dailyAyah_1 = require("./scheduled/dailyAyah");
Object.defineProperty(exports, "dailyAyah", { enumerable: true, get: function () { return dailyAyah_1.dailyAyah; } });
var fridayReminder_1 = require("./scheduled/fridayReminder");
Object.defineProperty(exports, "fridayReminder", { enumerable: true, get: function () { return fridayReminder_1.fridayReminder; } });
//# sourceMappingURL=index.js.map