import mysql from 'mysql2/promise'
import Monitor from '../classes/monitor'
import { Connection } from '../classes/connection'
import MonitorData from '../classes/monitordata'

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
})

async function migrate (): Promise<void> {
  await pool.query('CREATE TABLE IF NOT EXISTS connections (id INT AUTO_INCREMENT PRIMARY KEY, host VARCHAR(255), port INT, game VARCHAR(255), player VARCHAR(255), channel VARCHAR(255))')
  await pool.query('CREATE TABLE IF NOT EXISTS activity_log (id INT AUTO_INCREMENT PRIMARY KEY, guild_id VARCHAR(255), user_id VARCHAR(255), action VARCHAR(255), timestamp DATETIME)')
  await pool.query('CREATE TABLE IF NOT EXISTS user_links (id INT AUTO_INCREMENT PRIMARY KEY, guild_id VARCHAR(255), archipelago_name VARCHAR(255), discord_id VARCHAR(255), UNIQUE KEY (guild_id, archipelago_name))')

  // Migration for 1.3.0 - Add mention flags
  const [columns]: any = await pool.query('SHOW COLUMNS FROM connections')
  const columnNames = columns.map((c: any) => c.Field)
  if (!columnNames.includes('mention_join_leave')) {
    await pool.query('ALTER TABLE connections ADD COLUMN mention_join_leave TINYINT(1) DEFAULT 0')
  }
  if (!columnNames.includes('mention_item_finder')) {
    await pool.query('ALTER TABLE connections ADD COLUMN mention_item_finder TINYINT(1) DEFAULT 1')
  }
  if (!columnNames.includes('mention_item_receiver')) {
    await pool.query('ALTER TABLE connections ADD COLUMN mention_item_receiver TINYINT(1) DEFAULT 1')
  }
  if (!columnNames.includes('mention_completion')) {
    await pool.query('ALTER TABLE connections ADD COLUMN mention_completion TINYINT(1) DEFAULT 1')
  }
  if (!columnNames.includes('mention_hints')) {
    await pool.query('ALTER TABLE connections ADD COLUMN mention_hints TINYINT(1) DEFAULT 1')
  }
}

async function linkUser (guildId: string, archipelagoName: string, discordId: string) {
  await pool.query('INSERT INTO user_links (guild_id, archipelago_name, discord_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE discord_id = ?', [guildId, archipelagoName, discordId, discordId])
}

async function unlinkUser (guildId: string, archipelagoName: string) {
  await pool.query('DELETE FROM user_links WHERE guild_id = ? AND archipelago_name = ?', [guildId, archipelagoName])
}

async function getLinks (guildId: string): Promise<any[]> {
  const [rows] = await pool.query('SELECT archipelago_name, discord_id FROM user_links WHERE guild_id = ?', [guildId])
  return rows as any[]
}

async function createLog (guildId: string, userId: string, action: string) {
  try {
    await pool.query('INSERT INTO activity_log (guild_id, user_id, action, timestamp) VALUES (?, ?, ?, NOW())', [guildId, userId, action])
  } catch (err) {
    console.error('Failed to create log:', err)
  }
}

async function getConnections (): Promise<Connection[]> {
  const [rows] = await pool.query('SELECT * FROM connections')
  return (rows as any[]).map(row => ({
    ...row,
    mention_join_leave: !!row.mention_join_leave,
    mention_item_finder: !!row.mention_item_finder,
    mention_item_receiver: !!row.mention_item_receiver,
    mention_completion: !!row.mention_completion,
    mention_hints: !!row.mention_hints
  }))
}

async function makeConnection (data: MonitorData): Promise<void> {
  await pool.query('INSERT INTO connections (host, port, game, player, channel, mention_join_leave, mention_item_finder, mention_item_receiver, mention_completion, mention_hints) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.host, data.port, data.game, data.player, data.channel, data.mention_join_leave, data.mention_item_finder, data.mention_item_receiver, data.mention_completion, data.mention_hints])
}

async function removeConnection (monitor: Monitor) {
  await pool.query('DELETE FROM connections WHERE host = ? AND port = ? AND game = ? AND player = ? AND channel = ?', [monitor.data.host, monitor.data.port, monitor.data.game, monitor.data.player, monitor.channel.id])
}

const Database = {
  getConnections,
  makeConnection,
  removeConnection,
  createLog,
  migrate,
  linkUser,
  unlinkUser,
  getLinks
}

export default Database
