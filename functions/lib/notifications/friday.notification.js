"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFridayNotification = buildFridayNotification;
function buildFridayNotification() {
    const payload = { type: "jummah" };
    return {
        title: "Jumu'ah Mubarak",
        body: "Recite Surah Al-Kahf and prepare for Jumu'ah prayer.",
        sound: "default",
        // @ts-ignore
        data: payload,
        channelId: "friday-reminder",
    };
}
//# sourceMappingURL=friday.notification.js.map