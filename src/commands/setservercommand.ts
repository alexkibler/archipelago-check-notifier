import Command from '../classes/command'
import { ApplicationCommandOption, ApplicationCommandOptionType, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js'
import Database from '../utils/database'

export default class SetServerCommand extends Command {
  name = 'set-server'
  description = 'Set the default Archipelago server for this Discord server.'
  defaultMemberPermissions = PermissionFlagsBits.ManageGuild

  options: ApplicationCommandOption[] = [
    { type: ApplicationCommandOptionType.String, name: 'host', description: 'The host to use (e.g., archipelago.gg)', required: true },
    { type: ApplicationCommandOptionType.Integer, name: 'port', description: 'The port to use', required: true }
  ]

  constructor (client: any) {
    super()
    this.client = client
  }

  validate (interaction: ChatInputCommandInteraction) {
    const host = interaction.options.getString('host', true)

    // regex for domain or IP address
    const hostRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/
    if (!hostRegex.test(host)) {
      interaction.reply({ content: 'Invalid host name format. Please use domain name (e.g: archipelago.gg)', flags: [MessageFlags.Ephemeral] })
      return false
    }

    return true
  }

  async execute (interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: [MessageFlags.Ephemeral] })
    }

    if (!this.validate(interaction)) return

    const host = interaction.options.getString('host', true)
    const port = interaction.options.getInteger('port', true)

    await Database.setGuildServer(interaction.guildId, host, port)

    interaction.reply({ content: `Default server set to **${host}:${port}**. Members can now use \`/monitor\` without specifying host and port.`, flags: [MessageFlags.Ephemeral] })
  }
}
