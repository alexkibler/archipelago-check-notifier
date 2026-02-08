import MonitorData from '../classes/monitordata'
import { Client, itemsHandlingFlags } from 'archipelago.js'
import Monitor from '../classes/monitor'
import { Client as DiscordClient } from 'discord.js'
import Database from './database'

const monitors: Monitor[] = []

function make (data: MonitorData, client: DiscordClient): Promise<Monitor> {
  return new Promise<Monitor>((resolve, reject) => {
    const archi = new Client()

    // Login handles connection and authentication automatically
    archi.login(`${data.host}:${data.port}`, data.player, data.game, {
      items: itemsHandlingFlags.all,
      tags: ['IgnoreGame', 'Monitor'],
      version: { major: 0, minor: 6, build: 2 }
    }).then(() => {
      const monitor = new Monitor(archi, data, client)
      Database.createLog(monitor.guild.id, '0', `Connected to ${data.host}:${data.port}`)
      monitors.push(monitor)
      resolve(monitor)
    }).catch((err) => {
      console.error(`Login failed for ${data.player} on ${data.host}:${data.port}:`, err)
      reject(err)
    })
  })
}

function remove (uri: string, removeFromDb: boolean = true) {
  const monitor = monitors.find((monitor) => {
    const monitorKey = `${monitor.data.host}:${monitor.data.port}:${monitor.data.player}`
    return monitor.client.socket.url?.includes(uri) || `${monitor.data.host}:${monitor.data.port}` === uri || monitorKey === uri
  })
  if (monitor == null) return
  monitors.splice(monitors.indexOf(monitor), 1)
  monitor.stop()
  if (removeFromDb) {
    Database.removeConnection(monitor)
  }
  Database.createLog(monitor.guild.id, '0', `Disconnected from ${monitor.data.host}:${monitor.data.port}`)
}

function has (uri: string) {
  return monitors.some((monitor) => {
    const monitorKey = `${monitor.data.host}:${monitor.data.port}:${monitor.data.player}`
    return monitor.client.socket.url?.includes(uri) || `${monitor.data.host}:${monitor.data.port}` === uri || monitorKey === uri
  })
}

function get (guild: string) {
  return monitors.filter((monitor) => monitor.guild.id === guild)
}

const Monitors = {
  make,
  remove,
  has,
  get
}

export default Monitors
