"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
let db = null;
async function getDb() {
    if (db)
        return db;
    db = await (0, sqlite_1.open)({
        filename: process.env.DB_PATH || './database.sqlite',
        driver: sqlite3_1.default.Database
    });
    return db;
}
async function migrate() {
    const db = await getDb();
    await db.exec('CREATE TABLE IF NOT EXISTS connections (id INTEGER PRIMARY KEY AUTOINCREMENT, host VARCHAR(255), port INT, game VARCHAR(255), player VARCHAR(255), channel VARCHAR(255))');
    await db.exec('CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id VARCHAR(255), user_id VARCHAR(255), action VARCHAR(255), timestamp DATETIME)');
    await db.exec('CREATE TABLE IF NOT EXISTS user_links (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id VARCHAR(255), archipelago_name VARCHAR(255), discord_id VARCHAR(255), UNIQUE(guild_id, archipelago_name))');
    // Migration for 1.3.0 - Add mention flags
    const columns = await db.all('PRAGMA table_info(connections)');
    const columnNames = columns.map((c) => c.name);
    if (!columnNames.includes('mention_join_leave')) {
        await db.exec('ALTER TABLE connections ADD COLUMN mention_join_leave INTEGER DEFAULT 0');
    }
    if (!columnNames.includes('mention_item_finder')) {
        await db.exec('ALTER TABLE connections ADD COLUMN mention_item_finder INTEGER DEFAULT 1');
    }
    if (!columnNames.includes('mention_item_receiver')) {
        await db.exec('ALTER TABLE connections ADD COLUMN mention_item_receiver INTEGER DEFAULT 1');
    }
    if (!columnNames.includes('mention_completion')) {
        await db.exec('ALTER TABLE connections ADD COLUMN mention_completion INTEGER DEFAULT 1');
    }
    if (!columnNames.includes('mention_hints')) {
        await db.exec('ALTER TABLE connections ADD COLUMN mention_hints INTEGER DEFAULT 1');
    }
    // Migration for 1.4.0 - Add mention flags to user_links
    const linkColumns = await db.all('PRAGMA table_info(user_links)');
    const linkColumnNames = linkColumns.map((c) => c.name);
    if (!linkColumnNames.includes('mention_join_leave')) {
        await db.exec('ALTER TABLE user_links ADD COLUMN mention_join_leave INTEGER DEFAULT 0');
    }
    if (!linkColumnNames.includes('mention_item_finder')) {
        await db.exec('ALTER TABLE user_links ADD COLUMN mention_item_finder INTEGER DEFAULT 1');
    }
    if (!linkColumnNames.includes('mention_item_receiver')) {
        await db.exec('ALTER TABLE user_links ADD COLUMN mention_item_receiver INTEGER DEFAULT 1');
    }
    if (!linkColumnNames.includes('mention_completion')) {
        await db.exec('ALTER TABLE user_links ADD COLUMN mention_completion INTEGER DEFAULT 1');
    }
    if (!linkColumnNames.includes('mention_hints')) {
        await db.exec('ALTER TABLE user_links ADD COLUMN mention_hints INTEGER DEFAULT 1');
    }
}
async function linkUser(guildId, archipelagoName, discordId, flags) {
    const db = await getDb();
    const query = `
    INSERT INTO user_links (guild_id, archipelago_name, discord_id, mention_join_leave, mention_item_finder, mention_item_receiver, mention_completion, mention_hints)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, archipelago_name) DO UPDATE SET
      discord_id = excluded.discord_id,
      mention_join_leave = excluded.mention_join_leave,
      mention_item_finder = excluded.mention_item_finder,
      mention_item_receiver = excluded.mention_item_receiver,
      mention_completion = excluded.mention_completion,
      mention_hints = excluded.mention_hints
  `;
    await db.run(query, [
        guildId,
        archipelagoName,
        discordId,
        flags?.mention_join_leave ? 1 : 0,
        flags?.mention_item_finder ?? true ? 1 : 0,
        flags?.mention_item_receiver ?? true ? 1 : 0,
        flags?.mention_completion ?? true ? 1 : 0,
        flags?.mention_hints ?? true ? 1 : 0
    ]);
}
async function unlinkUser(guildId, archipelagoName) {
    const db = await getDb();
    await db.run('DELETE FROM user_links WHERE guild_id = ? AND archipelago_name = ?', [guildId, archipelagoName]);
}
async function getLinks(guildId) {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM user_links WHERE guild_id = ?', [guildId]);
    return rows.map(row => ({
        ...row,
        mention_join_leave: !!row.mention_join_leave,
        mention_item_finder: !!row.mention_item_finder,
        mention_item_receiver: !!row.mention_item_receiver,
        mention_completion: !!row.mention_completion,
        mention_hints: !!row.mention_hints
    }));
}
async function createLog(guildId, userId, action) {
    try {
        const db = await getDb();
        await db.run('INSERT INTO activity_log (guild_id, user_id, action, timestamp) VALUES (?, ?, ?, datetime("now"))', [guildId, userId, action]);
    }
    catch (err) {
        console.error('Failed to create log:', err);
    }
}
async function getConnections() {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM connections');
    return rows.map(row => ({
        ...row,
        mention_join_leave: !!row.mention_join_leave,
        mention_item_finder: !!row.mention_item_finder,
        mention_item_receiver: !!row.mention_item_receiver,
        mention_completion: !!row.mention_completion,
        mention_hints: !!row.mention_hints
    }));
}
async function getConnection(id) {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM connections WHERE id = ?', [id]);
    const connections = rows.map(row => ({
        ...row,
        mention_join_leave: !!row.mention_join_leave,
        mention_item_finder: !!row.mention_item_finder,
        mention_item_receiver: !!row.mention_item_receiver,
        mention_completion: !!row.mention_completion,
        mention_hints: !!row.mention_hints
    }));
    return connections.length > 0 ? connections[0] : null;
}
async function makeConnection(data) {
    const db = await getDb();
    const result = await db.run('INSERT INTO connections (host, port, game, player, channel, mention_join_leave, mention_item_finder, mention_item_receiver, mention_completion, mention_hints) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        data.host,
        data.port,
        data.game,
        data.player,
        data.channel,
        data.mention_join_leave ? 1 : 0,
        data.mention_item_finder ? 1 : 0,
        data.mention_item_receiver ? 1 : 0,
        data.mention_completion ? 1 : 0,
        data.mention_hints ? 1 : 0
    ]);
    return result.lastID;
}
async function removeConnection(monitor) {
    const db = await getDb();
    await db.run('DELETE FROM connections WHERE host = ? AND port = ? AND game = ? AND player = ? AND channel = ?', [monitor.data.host, monitor.data.port, monitor.data.game, monitor.data.player, monitor.channel.id]);
}
const Database = {
    getConnections,
    getConnection,
    makeConnection,
    removeConnection,
    createLog,
    migrate,
    linkUser,
    unlinkUser,
    getLinks
};
exports.default = Database;
