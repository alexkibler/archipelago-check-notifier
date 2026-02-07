import { Client, Events, InteractionType, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GatewayIntentBits, REST, Routes } from 'discord.js'
import Commands from './src/commands'
import Database from './src/utils/database'
import Monitors from './src/utils/monitors'
import { Connection } from './src/classes/connection'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables if .env file exists
dotenv.config()

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user?.tag}!`)

  try {
    await Database.migrate()
    console.log('Database migrated.')
  } catch (err) {
    console.error('Database migration failed:', err)
  }

  try {
    await Commands.init(client)
    console.log('Commands initialized.')
  } catch (err) {
    console.error('Command initialization failed:', err)
  }

  // Reconnect to all monitors
  try {
    const connections: Connection[] = await Database.getConnections()
    console.log(`Reconnecting to ${connections.length} monitors...`)
    for (const result of connections) {
      if (Monitors.has(`${result.host}:${result.port}`)) {
        console.log(`Already monitoring ${result.host}:${result.port}, skipping...`)
        continue
      }
      Monitors.make(result, client).catch(err => {
        console.error(`Failed to reconnect to monitor ${result.host}:${result.port}:`, err)
      })
    }
  } catch (err) {
    console.error('Failed to load connections from database:', err)
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('remonitor:')) {
        const connectionId = parseInt(interaction.customId.split(':')[1])
        const connection = await Database.getConnection(connectionId)
        if (!connection) {
          return interaction.reply({ content: 'Monitor configuration not found in database.', flags: [MessageFlags.Ephemeral] })
        }

        if (Monitors.has(`${connection.host}:${connection.port}`)) {
          Monitors.remove(`${connection.host}:${connection.port}`, false)
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] })
        Monitors.make(connection, client).then(() => {
          interaction.editReply({ content: `Now monitoring Archipelago on ${connection.host}:${connection.port}.` })
        }).catch(err => {
          console.error('Failed to create monitor:', err)
          interaction.editReply({ content: 'Failed to connect to Archipelago. Please check if the server is up.' })
        })
      }
      return
    }

    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      Commands.Autocomplete(interaction)
    } else if (interaction.type === InteractionType.ApplicationCommand) {
      if (interaction.isChatInputCommand()) {
        Commands.Execute(interaction)
        await Database.createLog(interaction.guildId || '0', interaction.user.id, `Executed command ${interaction.commandName}`)
      }
    }
  } catch (err) {
    console.error('Interaction error:', err)
    if (interaction.isRepliable()) {
      const payload: any = { content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] }
      if (interaction.replied || interaction.deferred) {
        interaction.followUp(payload).catch(() => {})
      } else {
        interaction.reply(payload).catch(() => {})
      }
    }
  }
})

client.on(Events.GuildCreate, async (guild) => {
  await Database.createLog(guild.id, '0', 'Added to guild')
})

client.on(Events.GuildDelete, async (guild) => {
  await Database.createLog(guild.id, '0', 'Removed from guild')
})

// Login using DISCORD_TOKEN
const token = process.env.DISCORD_TOKEN
if (!token) {
  console.error('Error: DISCORD_TOKEN environment variable is not set.')
  process.exit(1)
}

client.login(token)
