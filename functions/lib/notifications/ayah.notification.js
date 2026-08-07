"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAyahNotification = buildAyahNotification;
function buildAyahNotification(ayah) {
    const payload = {
        type: "ayah",
        surah: ayah.surah.englishName,
        surahNumber: ayah.surah.number,
        ayahNumber: ayah.verse.ayah,
    };
    return {
        title: `Ayah of the Day — ${ayah.surah.englishName}`,
        body: ayah.verse.translations.sahih_international,
        sound: "default",
        // @ts-ignore
        data: payload,
        channelId: "daily-ayah",
    };
}
//# sourceMappingURL=ayah.notification.js.map