"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const archipelago_js_1 = require("archipelago.js");
function getItem(client, playerId, itemId, flag) {
    const game = client.players.get(playerId)?.game;
    if (game === undefined)
        return 'Unknown Item';
    const dataPackage = client.data.package.get(game);
    if (dataPackage === undefined)
        return 'Unknown Item';
    const item = Object.entries(dataPackage.item_name_to_id).find(([, id]) => id === itemId);
    if (item === undefined)
        return 'Unknown Item';
    switch (flag) {
        case archipelago_js_1.ITEM_FLAGS.PROGRESSION:
            return `**${item[0]}**`;
        case archipelago_js_1.ITEM_FLAGS.NEVER_EXCLUDE:
            return `*${item[0]}*`;
        case archipelago_js_1.ITEM_FLAGS.TRAP:
            return `~~${item[0]}~~`;
        default:
            return item[0];
    }
}
function getLocation(client, playerId, locationId) {
    const game = client.players.get(playerId)?.game;
    if (game === undefined)
        return 'Unknown Location';
    const dataPackage = client.data.package.get(game);
    if (dataPackage === undefined)
        return 'Unknown Location';
    const location = Object.entries(dataPackage.location_name_to_id).find(([, id]) => id === locationId);
    if (location === undefined)
        return 'Unknown Location';
    return location[0];
}
const RandomHelper = {
    getItem,
    getLocation
};
exports.default = RandomHelper;
