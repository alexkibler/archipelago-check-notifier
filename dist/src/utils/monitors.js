"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const archipelago_js_1 = require("archipelago.js");
const monitor_1 = __importDefault(require("../classes/monitor"));
const database_1 = __importDefault(require("./database"));
const monitors = [];
function make(data, client) {
    return new Promise((resolve, reject) => {
        const archi = new archipelago_js_1.Client();
        const connectionInfo = {
            hostname: data.host,
            port: data.port,
            game: data.game,
            name: data.player,
            items_handling: archipelago_js_1.ITEMS_HANDLING_FLAGS.REMOTE_ALL,
            tags: ['IgnoreGame', 'Tracker', 'Monitor'],
            version: { major: 0, minor: 5, build: 0 }
        };
        archi.connect(connectionInfo).then(() => {
            const monitor = new monitor_1.default(archi, data, client);
            database_1.default.createLog(monitor.guild.id, '0', `Connected to ${data.host}:${data.port}`);
            monitors.push(monitor);
            resolve(monitor);
        }).catch((err) => {
            console.log(err);
            reject(err);
        });
    });
}
function remove(uri, removeFromDb = true) {
    const monitor = monitors.find((monitor) => monitor.client.uri?.includes(uri) || `${monitor.data.host}:${monitor.data.port}` === uri);
    if (monitor == null)
        return;
    monitors.splice(monitors.indexOf(monitor), 1);
    monitor.stop();
    if (removeFromDb) {
        database_1.default.removeConnection(monitor);
    }
    database_1.default.createLog(monitor.guild.id, '0', `Disconnected from ${monitor.data.host}:${monitor.data.port}`);
}
function has(uri) {
    return monitors.some((monitor) => monitor.client.uri?.includes(uri) || `${monitor.data.host}:${monitor.data.port}` === uri);
}
function get(guild) {
    return monitors.filter((monitor) => monitor.guild.id === guild);
}
const Monitors = {
    make,
    remove,
    has,
    get
};
exports.default = Monitors;
