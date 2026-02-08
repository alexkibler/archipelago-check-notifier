import Command from '../classes/command'
import { ApplicationCommandOption, ApplicationCommandOptionType, AutocompleteInteraction, ChatInputCommandInteraction, MessageFlags } from 'discord.js'
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
      required: true,
      autocomplete: true
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'player',
      description: 'The player name to request as (defaults to your linked player)',
      required: false
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'host',
      description: 'Server host (e.g., archipelago.gg) - required if no monitor exists',
      required: false
    },
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'port',
      description: 'Server port - required if no monitor exists',
      required: false
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'game',
      description: 'Game name (optional, will use IgnoreGame if not provided)',
      required: false
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'password',
      description: 'Slot password (if required)',
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

    let item = interaction.options.getString('item', true)
    // Remove surrounding quotes if present (Discord may add them)
    item = item.replace(/^['"](.*)['"]$/, '$1')
    let player = interaction.options.getString('player')
    let host = interaction.options.getString('host')
    let port = interaction.options.getInteger('port')
    let game = interaction.options.getString('game')
    let password = interaction.options.getString('password')

    // Clean up quotes from all string inputs
    if (player) player = player.replace(/^['"](.*)['"]$/, '$1')
    if (host) host = host.replace(/^['"](.*)['"]$/, '$1')
    if (game) game = game.replace(/^['"](.*)['"]$/, '$1')
    if (password) password = password.replace(/^['"](.*)['"]$/, '$1')

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

    // If we have an active monitor, use it
    if (activeMonitors.length > 0) {
      if (activeMonitors.length > 1) {
        return interaction.reply({ content: `Multiple active monitors found for player "**${player}**". This is unexpected and unsupported. Please ensure only one session is monitored per player.`, flags: [MessageFlags.Ephemeral] })
      }

      const monitor = activeMonitors[0]

      try {
        console.log(`[Hint Command] Using existing monitor`)
        console.log(`[Hint Command] Connected: ${monitor.client.socket.connected}, URL: ${monitor.client.socket.url}`)
        console.log(`[Hint Command] Sending hint request for: "${item}"`)

        await monitor.client.messages.say(`!hint ${item}`)
        console.log(`[Hint Command] User ${interaction.user.tag} (${interaction.user.id}) requested hint for "${item}" as player "${player}" in guild ${interaction.guildId}.`)

        return interaction.reply({ content: `Hint request for "**${item}**" sent to Archipelago as player "**${player}**".`, flags: [MessageFlags.Ephemeral] })
      } catch (err) {
        console.error('Failed to send hint request:', err)
        return interaction.reply({ content: `Failed to send hint request to the Archipelago server: ${err}`, flags: [MessageFlags.Ephemeral] })
      }
    }

    // No active monitor - create temporary connection
    if (!host || !port) {
      return interaction.reply({ content: `No active monitor found for player "**${player}**". Please provide \`host\`, \`port\`, and \`game\` parameters to create a temporary connection, or use \`/monitor\` to set up a persistent monitor.`, flags: [MessageFlags.Ephemeral] })
    }

    if (!game) {
      return interaction.reply({ content: `Please provide the \`game\` parameter (e.g., "YARG", "Clique", etc.) to connect to the server.`, flags: [MessageFlags.Ephemeral] })
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] })

    try {
      await this.sendHintWithTemporaryConnection(interaction, host, port, player, game, password, item)
    } catch (err) {
      console.error('Failed to send hint with temporary connection:', err)
      await interaction.editReply({ content: `Failed to connect to Archipelago server: ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  async sendHintWithTemporaryConnection (
    interaction: ChatInputCommandInteraction,
    host: string,
    port: number,
    player: string,
    game: string | null,
    password: string | null,
    item: string
  ) {
    const { Client: ArchipelagoClient, itemsHandlingFlags } = await import('archipelago.js')
    const client = new ArchipelagoClient()

    return new Promise<void>((resolve, reject) => {
      const hints: string[] = []
      let firstHintReceived = false
      let collectionTimeout: NodeJS.Timeout | null = null

      const timeout = setTimeout(() => {
        if (!firstHintReceived) {
          cleanup()
          client.socket.disconnect()
          reject(new Error('Hint request timed out after 10 seconds'))
        }
      }, 10000)

      const sendAllHints = async () => {
        clearTimeout(timeout)
        if (collectionTimeout) clearTimeout(collectionTimeout)

        if (hints.length === 0) {
          await interaction.editReply({ content: '**No hints found.**' }).catch(console.error)
          cleanup()
          client.socket.disconnect()
          resolve()
          return
        }

        // Split hints into chunks that fit Discord's 2000 char limit
        const chunks: string[] = []
        let currentChunk = `**Hint results (${hints.length}):**\n`

        for (const hint of hints) {
          const hintLine = hint + '\n'
          if ((currentChunk + hintLine).length > 1900) {
            chunks.push(currentChunk)
            currentChunk = hintLine
          } else {
            currentChunk += hintLine
          }
        }

        if (currentChunk.length > 0) {
          chunks.push(currentChunk)
        }

        // Send first chunk as edit, rest as follow-ups
        await interaction.editReply({ content: chunks[0] }).catch(console.error)

        for (let i = 1; i < chunks.length; i++) {
          await interaction.followUp({ content: chunks[i], flags: [MessageFlags.Ephemeral] }).catch(console.error)
        }

        cleanup()
        client.socket.disconnect()
        resolve()
      }

      // Listen for hint response on multiple event types
      const hintHandler = (text: string, nodes?: any[]) => {
        console.log('[Hint Command] Hint received:', { text })

        // Format the message properly from nodes if available
        let formattedText = text
        if (nodes && nodes.length > 0) {
          formattedText = nodes.map((node: any) => {
            if (node.type === 'player') return `**${node.text}**`
            if (node.type === 'item') return `*${node.text}*`
            if (node.type === 'location') return `**${node.text}**`
            return node.text
          }).join('')
        }

        hints.push(formattedText)

        if (!firstHintReceived) {
          firstHintReceived = true
          // Give it 2 seconds to collect all hints after the first one
          collectionTimeout = setTimeout(sendAllHints, 2000)
        } else {
          // Reset the collection timeout with each new hint
          if (collectionTimeout) clearTimeout(collectionTimeout)
          collectionTimeout = setTimeout(sendAllHints, 2000)
        }
      }

      const messageHandler = (text: string, nodes: any[]) => {
        // Check if this looks like a hint response
        if (text.toLowerCase().includes('[hint]') && !text.includes('!hint')) {
          hintHandler(text, nodes)
        }
      }

      const cleanup = () => {
        client.messages.off('userCommand', hintHandler)
        client.messages.off('serverChat', hintHandler)
        client.messages.off('message', messageHandler)
      }

      client.messages.on('userCommand', hintHandler)
      client.messages.on('serverChat', hintHandler)
      client.messages.on('message', messageHandler)

      // Connect and send hint
      const loginOptions: any = {
        items: itemsHandlingFlags.all,
        tags: ['IgnoreGame', 'Monitor'],
        version: { major: 0, minor: 6, build: 2 }
      }

      if (password) {
        loginOptions.password = password
      }

      const url = host.includes('://') ? `${host}:${port}` : `wss://${host}:${port}`
      console.log(`[Hint Command] Connecting to ${url} as ${player}...`)

      client.login(url, player, game || '', loginOptions)
        .then(async () => {
          console.log(`[Hint Command] Temporary connection established for ${player} on ${url}`)
          await client.messages.say(`!hint ${item}`)
          console.log(`[Hint Command] Hint request sent for "${item}"`)
        })
        .catch((err) => {
          clearTimeout(timeout)
          cleanup()
          client.socket.disconnect()
          console.error(`[Hint Command] Connection error:`, err)
          reject(err)
        })
    })
  }

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focusedOption = interaction.options.getFocused(true)

    if (focusedOption.name !== 'item') return

    if (!interaction.guildId) {
      console.log('[Hint Autocomplete] No guild ID')
      return interaction.respond([])
    }

    try {
      // Get the player name (from linked account or player parameter)
      let player = interaction.options.getString('player')
      if (!player) {
        const links = await Database.getLinks(interaction.guildId)
        const userLink = links.find(link => link.discord_id === interaction.user.id)
        if (userLink) {
          player = userLink.archipelago_name
        }
      }

      console.log('[Hint Autocomplete] Player:', player)

      if (!player) {
        console.log('[Hint Autocomplete] No player found')
        return interaction.respond([])
      }

      // Find the active monitor for this player
      const guildMonitors = Monitors.get(interaction.guildId)
      console.log('[Hint Autocomplete] Guild monitors:', guildMonitors.length)
      const activeMonitors = guildMonitors.filter(monitor => monitor.data.player === player)
      console.log('[Hint Autocomplete] Active monitors for player:', activeMonitors.length)

      if (activeMonitors.length === 0) {
        console.log('[Hint Autocomplete] No active monitors for player')
        return interaction.respond([])
      }

      const monitor = activeMonitors[0]
      const game = monitor.data.game
      console.log('[Hint Autocomplete] Game:', game)

      // Get item list from data package
      const gamePackage = monitor.client.package.findPackage(game) as any
      console.log('[Hint Autocomplete] Game package found:', !!gamePackage)

      if (!gamePackage) {
        console.log('[Hint Autocomplete] No game package')
        return interaction.respond([])
      }

      // Let's check both itemTable and reverseItemTable structure
      const itemTable = gamePackage.itemTable
      const reverseItemTable = gamePackage.reverseItemTable

      console.log('[Hint Autocomplete] Item table found:', !!itemTable)
      console.log('[Hint Autocomplete] Reverse item table found:', !!reverseItemTable)

      // Check the keys of reverseItemTable - they should be item names
      if (reverseItemTable) {
        const reverseKeys = Object.keys(reverseItemTable)
        console.log('[Hint Autocomplete] Reverse table has', reverseKeys.length, 'entries')
        console.log('[Hint Autocomplete] First reverse key:', reverseKeys[0])
        console.log('[Hint Autocomplete] First reverse value:', reverseItemTable[reverseKeys[0]])
      }

      // reverseItemTable maps IDs to names, so we want the VALUES
      if (!reverseItemTable) {
        console.log('[Hint Autocomplete] No reverse item table')
        return interaction.respond([])
      }

      // Get the item names (values from reverseItemTable)
      const itemNames = Object.values(reverseItemTable) as string[]
      console.log('[Hint Autocomplete] Total item names:', itemNames.length)
      const userInput = focusedOption.value.toLowerCase()

      // Filter items based on user input
      const filtered = itemNames
        .filter(item => {
          const itemName = typeof item === 'string' ? item : String(item)
          return itemName.toLowerCase().includes(userInput)
        })
        .slice(0, 25) // Discord autocomplete limit
        .map(item => {
          const itemName = typeof item === 'string' ? item : String(item)
          return { name: itemName, value: itemName }
        })

      console.log('[Hint Autocomplete] Filtered items:', filtered.length)
      interaction.respond(filtered)
    } catch (err) {
      console.error('[Hint Autocomplete] Error:', err)
      interaction.respond([])
    }
  }
}
