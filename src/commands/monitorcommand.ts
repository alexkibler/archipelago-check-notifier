import Command from '../classes/command'
import { ApplicationCommandOption, ApplicationCommandOptionType, ChannelType, ChatInputCommandInteraction, MessageFlags } from 'discord.js'
import MonitorData from '../classes/monitordata'
import Monitors from '../utils/monitors'
import Database from '../utils/database'

export default class MonitorCommand extends Command {
  name = 'monitor'
  description = 'Start tracking an archipelago session.'

  options: ApplicationCommandOption[] = [
    { type: ApplicationCommandOptionType.String, name: 'game', description: 'The game to monitor', required: true },
    { type: ApplicationCommandOptionType.String, name: 'player', description: 'The player to monitor', required: true },
    { type: ApplicationCommandOptionType.Channel, channelTypes: [ChannelType.GuildText], name: 'channel', description: 'The channel to send messages to', required: true },
    { type: ApplicationCommandOptionType.String, name: 'host', description: 'The host to use (optional if server has default set)', required: false },
    { type: ApplicationCommandOptionType.Integer, name: 'port', description: 'The port to use (optional if server has default set)', required: false },
    { type: ApplicationCommandOptionType.Boolean, name: 'mention_join_leave', description: 'Whether to @ people for joining or leaving (default: false)', required: false },
    { type: ApplicationCommandOptionType.Boolean, name: 'mention_item_finder', description: 'Whether to @ people when they find an item (default: true)', required: false },
    { type: ApplicationCommandOptionType.Boolean, name: 'mention_item_receiver', description: 'Whether to @ people when they receive an item (default: true)', required: false },
    { type: ApplicationCommandOptionType.Boolean, name: 'mention_completion', description: 'Whether to @ people when they complete their goal (default: true)', required: false },
    { type: ApplicationCommandOptionType.Boolean, name: 'mention_hints', description: 'Whether to @ people when they are mentioned in a hint (default: true)', required: false }
  ]

  constructor (client: any) {
    super()
    this.client = client
  }

  validate (interaction: ChatInputCommandInteraction, host: string) {
    // regex for domain or IP address - eg. archipelago.gg
    const hostRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/
    if (!hostRegex.test(host)) {
      interaction.reply({ content: 'Invalid host name format. Please use domain name (e.g: archipelago.gg)', flags: [MessageFlags.Ephemeral] })
      return false
    }

    const channel = interaction.options.getChannel('channel', true)
    if (channel == null) return false

    // Only add to channels in this guild
    if (interaction.guild?.channels.cache.get(channel.id) == null) return false

    return true
  }

  async execute (interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: [MessageFlags.Ephemeral] })
    }

    // Get host and port from command or guild default
    let host = interaction.options.getString('host')
    let port = interaction.options.getInteger('port')

    // If host or port not provided, use guild default
    if (!host || !port) {
      const guildServer = await Database.getGuildServer(interaction.guildId)
      if (!guildServer) {
        return interaction.reply({ content: 'No default server set for this Discord server. Please provide `host` and `port`, or ask an admin to use `/set-server` to set a default.', flags: [MessageFlags.Ephemeral] })
      }
      host = guildServer.host
      port = guildServer.port
    }

    // Validate text input.
    if (!this.validate(interaction, host)) return

    const monitorData: MonitorData = {
      game: interaction.options.getString('game', true),
      player: interaction.options.getString('player', true),
      host,
      port,
      channel: interaction.options.getChannel('channel', true).id,
      mention_join_leave: interaction.options.getBoolean('mention_join_leave') ?? false,
      mention_item_finder: interaction.options.getBoolean('mention_item_finder') ?? true,
      mention_item_receiver: interaction.options.getBoolean('mention_item_receiver') ?? true,
      mention_completion: interaction.options.getBoolean('mention_completion') ?? true,
      mention_hints: interaction.options.getBoolean('mention_hints') ?? true
    }

    // Only allow one monitor per host/port/player combo
    const monitorKey = `${monitorData.host}:${monitorData.port}:${monitorData.player}`
    if (Monitors.has(monitorKey)) {
      return interaction.reply({ content: `Already monitoring ${monitorData.player} on that host!`, flags: [MessageFlags.Ephemeral] })
    }

    // Send a message to the channel to confirm the monitor has been added.
    const textChannel = this.client.channels.cache.get(monitorData.channel)
    if (textChannel?.isTextBased()) {
      (textChannel as any).send('This monitor will now track Archipelago on this channel.').catch(console.error)
    } else {
      return interaction.reply({ content: 'Could not find the specified channel in cache or it is not text-based.', flags: [MessageFlags.Ephemeral] })
    }

    // Make the monitor and save it
    Monitors.make(monitorData, this.client).then(async (monitor) => {
      monitor.data.id = await Database.makeConnection(monitorData)
    }).catch(err => {
      console.error('Failed to create monitor:', err)
      interaction.followUp({ content: 'Failed to connect to Archipelago. Please check host and port.', flags: [MessageFlags.Ephemeral] })
    })

    interaction.reply({ content: `Now monitoring Archipelago on ${monitorData.host}:${monitorData.port}.`, flags: [MessageFlags.Ephemeral] })
  }
}
