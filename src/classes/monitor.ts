import { EmbedBuilder, Guild, Client as DiscordClient, GuildChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { Client, itemsHandlingFlags } from 'archipelago.js'
import MonitorData from './monitordata'
import Database from '../utils/database'

export default class Monitor {
  client: Client
  channel: any
  guild: Guild
  data: MonitorData

  isReconnecting: boolean = false
  isActive: boolean = true
  reconnectTimeout: any = null

  stop () {
    this.isActive = false
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.client.socket.disconnect()
  }

  queue = {
    hints: [] as string[],
    items: [] as string[]
  }

  addQueue (message: string, type: 'hints' | 'items' = 'hints') {
    if (this.queue.hints.length === 0 && this.queue.items.length === 0) setTimeout(() => this.sendQueue(), 150)

    switch (type) {
      case 'hints':
        this.queue.hints.push(message)
        break
      case 'items':
        this.queue.items.push(message)
        break
    }
  }

  sendQueue () {
    const hints = this.queue.hints.map((message, index) => ({ name: `#${index + 1}`, value: message }))
    this.queue.hints = []
    while (hints.length > 0) {
      const batch = hints.splice(0, 25)
      const mentions = new Set<string>()
      const regex = /<@(\d+)>/g
      batch.forEach(f => {
        let match
        while ((match = regex.exec(f.value)) !== null) {
          mentions.add(match[1])
        }
      })

      const content = mentions.size > 0 ? Array.from(mentions).map(id => `<@${id}>`).join(' ') : undefined
      const embed = new EmbedBuilder().setTitle('Hints').addFields(batch).data
      this.channel.send({ content, embeds: [embed] }).catch(console.error)
    }

    const items = this.queue.items.map((message, index) => ({ name: `#${index + 1}`, value: message }))
    this.queue.items = []
    while (items.length > 0) {
      const batch = items.splice(0, 25)
      const mentions = new Set<string>()
      const regex = /<@(\d+)>/g
      batch.forEach(f => {
        let match
        while ((match = regex.exec(f.value)) !== null) {
          mentions.add(match[1])
        }
      })

      const content = mentions.size > 0 ? Array.from(mentions).map(id => `<@${id}>`).join(' ') : undefined
      const embed = new EmbedBuilder().setTitle('Items').addFields(batch).data
      this.channel.send({ content, embeds: [embed] }).catch(console.error)
    }
  }

  send (message: string, components?: any[]) {
    const embed = new EmbedBuilder().setDescription(message).setTitle('Archipelago')

    const mentions = new Set<string>()
    const regex = /<@(\d+)>/g
    let match
    while ((match = regex.exec(message)) !== null) {
      mentions.add(match[1])
    }

    const content = mentions.size > 0 ? Array.from(mentions).map(id => `<@${id}>`).join(' ') : undefined
    this.channel.send({ content, embeds: [embed.data], components }).catch(console.error)
  }

  constructor (client: Client, monitorData: MonitorData, discordClient: DiscordClient) {
    this.client = client
    this.data = monitorData

    const channel = discordClient.channels.cache.get(monitorData.channel)
    if (!channel || !channel.isTextBased() || !(channel instanceof GuildChannel)) {
      throw new Error(`Channel ${monitorData.channel} not found, is not text-based, or is not a guild channel.`)
    }

    this.channel = channel
    this.guild = channel.guild

    client.socket.on('disconnected', this.onDisconnect.bind(this))
    client.socket.on('connectionRefused', this.onDisconnect.bind(this))

    // New v2 Message Handling
    client.messages.on('itemSent', async (text, item, nodes) => {
      if (!this.isActive) return
      const formatted = await this.formatWithMentions(text, nodes)
      this.addQueue(formatted, 'items')
    })

    client.messages.on('itemHinted', async (text, item, found, nodes) => {
      if (!this.isActive) return
      console.log('[itemHinted event]', { text, item, found })
      const formatted = await this.formatWithMentions(text, nodes)
      this.addQueue(formatted, 'hints')
    })

    // Listen for server chat messages (like hint responses)
    client.messages.on('serverChat', async (message, nodes) => {
      if (!this.isActive) return
      console.log('[serverChat event]', { message })

      // Check if this is a hint response
      if (message.toLowerCase().includes('hint')) {
        const formatted = await this.formatWithMentions(message, nodes)
        this.send(formatted)
      }
    })

    // Listen for ALL messages to debug
    client.messages.on('message', async (text, nodes) => {
      if (!this.isActive) return
      console.log('[message event (all)]', { text })
    })

    // Listen for user command results (like !hint responses)
    client.messages.on('userCommand', async (text, nodes) => {
      if (!this.isActive) return
      console.log('[userCommand event]', { text })
      const formatted = await this.formatWithMentions(text, nodes)
      this.send(formatted)
    })

    client.messages.on('connected', async (text, player, tags, nodes) => {
      if (!this.isActive) return
      if (tags.includes('Monitor')) return
      const formatted = await this.formatWithMentions(text, nodes, 'mention_join_leave')
      this.send(formatted)
    })

    client.messages.on('disconnected', async (text, player, nodes) => {
      if (!this.isActive) return
      const formatted = await this.formatWithMentions(text, nodes, 'mention_join_leave')
      this.send(formatted)
    })

    client.messages.on('goaled', async (text, player, nodes) => {
      if (!this.isActive) return
      const formatted = await this.formatWithMentions(text, nodes, 'mention_completion')
      this.send(formatted)
    })

    client.messages.on('released', async (text, player, nodes) => {
      if (!this.isActive) return
      const formatted = await this.formatWithMentions(text, nodes, 'mention_item_finder')
      this.send(formatted)
    })

    client.messages.on('collected', async (text, player, nodes) => {
      if (!this.isActive) return
      const formatted = await this.formatWithMentions(text, nodes, 'mention_item_finder')
      this.send(formatted)
    })
  }

  // Helper to convert nodes to text with Discord mentions applied
  async formatWithMentions (plainText: string, nodes: any[], flagName?: string): Promise<string> {
    const links = await Database.getLinks(this.guild.id)
    const linkMap = new Map<string, any>(links.map(l => [l.archipelago_name, l]))

    return nodes.map((node: any) => {
      if (node.type === 'player') {
        const playerName = node.player.name
        const link = linkMap.get(playerName)
        if (link) {
          let shouldMention = true
          if (flagName && link[flagName] !== undefined) {
            shouldMention = !!link[flagName]
          }
          if (shouldMention) return `<@${link.discord_id}>`
        }
        return `**${node.text}**`
      }
      if (node.type === 'item') return `*${node.text}*`
      if (node.type === 'location') return `**${node.text}**`
      return node.text
    }).join('')
  }

  onDisconnect () {
    if (!this.isActive || this.isReconnecting) return
    this.isReconnecting = true

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`remonitor:${this.data.id}`)
          .setLabel('Re-monitor')
          .setStyle(ButtonStyle.Primary)
      )

    this.send('Disconnected from the server.', [row])
    this.reconnect()
  }

  reconnect () {
    if (!this.isActive) return

    this.client.login(`${this.data.host}:${this.data.port}`, this.data.player, this.data.game, {
      items: itemsHandlingFlags.all,
      tags: ['IgnoreGame', 'Monitor'],
      version: { major: 0, minor: 6, build: 2 }
    }).then(() => {
      this.isReconnecting = false
    }).catch((err) => {
      console.error(`Reconnect failed for ${this.data.player} on ${this.data.host}:${this.data.port}:`, err)
      if (!this.isActive) return
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null
        this.reconnect()
      }, 300000)
    })
  }
}
