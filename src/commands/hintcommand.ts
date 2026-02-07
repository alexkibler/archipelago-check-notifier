import Command from '../classes/command'
import { ApplicationCommandOption, ApplicationCommandOptionType, ChatInputCommandInteraction, MessageFlags } from 'discord.js'
import Database from '../utils/database'
import Monitors from '../utils/monitors'

export default class HintCommand extends Command {
  name = 'hint'
  description = 'Request a hint for an item from the Archipelago server.'

  options: ApplicationCommandOption[] = [
    {
      type: ApplicationCommandOptionType.String,
      name: 'item',
      description: 'The item to request a hint for',
      required: true
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'player',
      description: 'The player name to request as (defaults to your linked player)',
      required: false
    }
  ]

  constructor (client: any) {
    super()
    this.client = client
  }

  async execute (interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: [MessageFlags.Ephemeral] })
    }

    const item = interaction.options.getString('item', true)
    let player = interaction.options.getString('player')

    // If player is not provided, try to find a link
    if (!player) {
      try {
        const links = await Database.getLinks(interaction.guildId)
        const userLink = links.find(link => link.discord_id === interaction.user.id)
        if (userLink) {
          player = userLink.archipelago_name
        }
      } catch (err) {
        console.error('Failed to retrieve user links:', err)
        return interaction.reply({ content: 'An error occurred while checking your linked player.', flags: [MessageFlags.Ephemeral] })
      }
    }

    if (!player) {
      return interaction.reply({ content: 'Could not determine which player to hint as. Please provide the `player` option or use `/link` to link your Discord account to an Archipelago player.', flags: [MessageFlags.Ephemeral] })
    }

    // Find the active monitor for this player
    const guildMonitors = Monitors.get(interaction.guildId)
    const activeMonitors = guildMonitors.filter(monitor => monitor.data.player === player)

    if (activeMonitors.length === 0) {
      return interaction.reply({ content: `No active Archipelago monitor found for player "**${player}**" in this server. The bot must be monitoring the session as this player to send hints.`, flags: [MessageFlags.Ephemeral] })
    }

    if (activeMonitors.length > 1) {
      return interaction.reply({ content: `Multiple active monitors found for player "**${player}**". This is unexpected and unsupported. Please ensure only one session is monitored per player.`, flags: [MessageFlags.Ephemeral] })
    }

    const monitor = activeMonitors[0]

    try {
      // Send the hint command to the Archipelago server
      monitor.client.say(`!hint ${item}`)
      console.log(`[Hint Command] User ${interaction.user.tag} (${interaction.user.id}) requested hint for "${item}" as player "${player}" in guild ${interaction.guildId}.`)

      interaction.reply({ content: `Hint request for "**${item}**" sent to Archipelago as player "**${player}**".`, flags: [MessageFlags.Ephemeral] })
    } catch (err) {
      console.error('Failed to send hint request:', err)
      interaction.reply({ content: 'Failed to send hint request to the Archipelago server.', flags: [MessageFlags.Ephemeral] })
    }
  }
}
