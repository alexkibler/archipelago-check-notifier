import sqlite3 from 'sqlite3'
import { open, Database as SQLiteDatabase } from 'sqlite'
import Monitor from '../classes/monitor'
import { Connection } from '../classes/connection'
import MonitorData from '../classes/monitordata'

let db: SQLiteDatabase | null = null

async function getDb () {
  if (db) return db
  db = await open({
    filename: process.env.DB_PATH || './database.sqlite',
    driver: sqlite3.Database
  })
  return db
}

async function migrate (): Promise<void> {
  const db = await getDb()
  await db.exec('CREATE TABLE IF NOT EXISTS connections (id INTEGER PRIMARY KEY AUTOINCREMENT, host VARCHAR(255), port INT, game VARCHAR(255), player VARCHAR(255), channel VARCHAR(255))')
  await db.exec('CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id VARCHAR(255), user_id VARCHAR(255), action VARCHAR(255), timestamp DATETIME)')
  await db.exec('CREATE TABLE IF NOT EXISTS user_links (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id VARCHAR(255), archipelago_name VARCHAR(255), discord_id VARCHAR(255), UNIQUE(guild_id, archipelago_name))')

  // Migration for 1.3.0 - Add mention flags
  const columns = await db.all('PRAGMA table_info(connections)')
  const columnNames = columns.map((c: any) => c.name)
  if (!columnNames.includes('mention_join_leave')) {
    await db.exec('ALTER TABLE connections ADD COLUMN mention_join_leave INTEGER DEFAULT 0')
  }
  if (!columnNames.includes('mention_item_finder')) {
    await db.exec('ALTER TABLE connections ADD COLUMN mention_item_finder INTEGER DEFAULT 1')
  }
  if (!columnNames.includes('mention_item_receiver')) {
    await db.exec('ALTER TABLE connections ADD COLUMN mention_item_receiver INTEGER DEFAULT 1')
  }
  if (!columnNames.includes('mention_completion')) {
    await db.exec('ALTER TABLE connections ADD COLUMN mention_completion INTEGER DEFAULT 1')
  }
  if (!columnNames.includes('mention_hints')) {
    await db.exec('ALTER TABLE connections ADD COLUMN mention_hints INTEGER DEFAULT 1')
  }

  // Migration for 1.4.0 - Add mention flags to user_links
  const linkColumns = await db.all('PRAGMA table_info(user_links)')
  const linkColumnNames = linkColumns.map((c: any) => c.name)
  if (!linkColumnNames.includes('mention_join_leave')) {
    await db.exec('ALTER TABLE user_links ADD COLUMN mention_join_leave INTEGER DEFAULT 0')
  }
  if (!linkColumnNames.includes('mention_item_finder')) {
    await db.exec('ALTER TABLE user_links ADD COLUMN mention_item_finder INTEGER DEFAULT 1')
  }
  if (!linkColumnNames.includes('mention_item_receiver')) {
    await db.exec('ALTER TABLE user_links ADD COLUMN mention_item_receiver INTEGER DEFAULT 1')
  }
  if (!linkColumnNames.includes('mention_completion')) {
    await db.exec('ALTER TABLE user_links ADD COLUMN mention_completion INTEGER DEFAULT 1')
  }
  if (!linkColumnNames.includes('mention_hints')) {
    await db.exec('ALTER TABLE user_links ADD COLUMN mention_hints INTEGER DEFAULT 1')
  }
}

async function linkUser (guildId: string, archipelagoName: string, discordId: string, flags?: {
  mention_join_leave?: boolean,
  mention_item_finder?: boolean,
  mention_item_receiver?: boolean,
  mention_completion?: boolean,
  mention_hints?: boolean
}) {
  const db = await getDb()
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
  `
  await db.run(query, [
    guildId,
    archipelagoName,
    discordId,
    flags?.mention_join_leave ? 1 : 0,
    flags?.mention_item_finder ?? true ? 1 : 0,
    flags?.mention_item_receiver ?? true ? 1 : 0,
    flags?.mention_completion ?? true ? 1 : 0,
    flags?.mention_hints ?? true ? 1 : 0
  ])
}

async function unlinkUser (guildId: string, archipelagoName: string) {
  const db = await getDb()
  await db.run('DELETE FROM user_links WHERE guild_id = ? AND archipelago_name = ?', [guildId, archipelagoName])
}

async function getLinks (guildId: string): Promise<any[]> {
  const db = await getDb()
  const rows = await db.all('SELECT * FROM user_links WHERE guild_id = ?', [guildId])
  return rows.map(row => ({
    ...row,
    mention_join_leave: !!row.mention_join_leave,
    mention_item_finder: !!row.mention_item_finder,
    mention_item_receiver: !!row.mention_item_receiver,
    mention_completion: !!row.mention_completion,
    mention_hints: !!row.mention_hints
  }))
}

async function createLog (guildId: string, userId: string, action: string) {
  try {
    const db = await getDb()
    await db.run('INSERT INTO activity_log (guild_id, user_id, action, timestamp) VALUES (?, ?, ?, datetime("now"))', [guildId, userId, action])
  } catch (err) {
    console.error('Failed to create log:', err)
  }
}

async function getConnections (): Promise<Connection[]> {
  const db = await getDb()
  const rows = await db.all('SELECT * FROM connections')
  return rows.map(row => ({
    ...row,
    mention_join_leave: !!row.mention_join_leave,
    mention_item_finder: !!row.mention_item_finder,
    mention_item_receiver: !!row.mention_item_receiver,
    mention_completion: !!row.mention_completion,
    mention_hints: !!row.mention_hints
  }))
}

async function getConnection (id: number): Promise<Connection | null> {
  const db = await getDb()
  const rows = await db.all('SELECT * FROM connections WHERE id = ?', [id])
  const connections = rows.map(row => ({
    ...row,
    mention_join_leave: !!row.mention_join_leave,
    mention_item_finder: !!row.mention_item_finder,
    mention_item_receiver: !!row.mention_item_receiver,
    mention_completion: !!row.mention_completion,
    mention_hints: !!row.mention_hints
  }))
  return connections.length > 0 ? connections[0] : null
}

async function makeConnection (data: MonitorData): Promise<number> {
  const db = await getDb()
  const result = await db.run('INSERT INTO connections (host, port, game, player, channel, mention_join_leave, mention_item_finder, mention_item_receiver, mention_completion, mention_hints) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
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
    ])
  return result.lastID as number
}

async function removeConnection (monitor: Monitor) {
  const db = await getDb()
  await db.run('DELETE FROM connections WHERE host = ? AND port = ? AND game = ? AND player = ? AND channel = ?', [monitor.data.host, monitor.data.port, monitor.data.game, monitor.data.player, monitor.channel.id])
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
}

export default Database
