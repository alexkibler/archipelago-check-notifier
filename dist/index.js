"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const commands_1 = __importDefault(require("./src/commands"));
const database_1 = __importDefault(require("./src/utils/database"));
const monitors_1 = __importDefault(require("./src/utils/monitors"));
const client = new discord_js_1.Client({ intents: ['Guilds'] });
client.on(discord_js_1.Events.ClientReady, async () => {
    try {
        await database_1.default.migrate();
        console.log('Database migrated.');
    }
    catch (err) {
        console.error('Database migration failed:', err);
    }
    try {
        await commands_1.default.init(client);
        console.log('Commands initialized.');
    }
    catch (err) {
        console.error('Command initialization failed:', err);
    }
    // Reconnect to all monitors
    try {
        const connections = await database_1.default.getConnections();
        console.log(`Reconnecting to ${connections.length} monitors...`);
        for (const result of connections) {
            if (monitors_1.default.has(`${result.host}:${result.port}`)) {
                console.log(`Already monitoring ${result.host}:${result.port}, skipping...`);
                continue;
            }
            monitors_1.default.make(result, client).catch(err => {
                console.error(`Failed to reconnect to monitor ${result.host}:${result.port}:`, err);
                const channel = client.channels.cache.get(result.channel);
                if (channel?.isTextBased()) {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setTitle('Archipelago')
                        .setDescription(`Failed to reconnect to monitor ${result.host}:${result.port} on startup.`);
                    const row = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId(`remonitor:${result.id}`)
                        .setLabel('Re-monitor')
                        .setStyle(discord_js_1.ButtonStyle.Primary));
                    channel.send({ embeds: [embed], components: [row] }).catch(console.error);
                }
            });
        }
    }
    catch (err) {
        console.error('Failed to load connections from database:', err);
    }
});
client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('remonitor:')) {
                const connectionId = parseInt(interaction.customId.split(':')[1]);
                const connection = await database_1.default.getConnection(connectionId);
                if (!connection) {
                    return interaction.reply({ content: 'Monitor configuration not found in database.', flags: [discord_js_1.MessageFlags.Ephemeral] });
                }
                if (monitors_1.default.has(`${connection.host}:${connection.port}`)) {
                    monitors_1.default.remove(`${connection.host}:${connection.port}`, false);
                }
                await interaction.deferReply({ flags: [discord_js_1.MessageFlags.Ephemeral] });
                monitors_1.default.make(connection, client).then(() => {
                    interaction.editReply({ content: `Now monitoring Archipelago on ${connection.host}:${connection.port}.` });
                }).catch(err => {
                    console.error('Failed to create monitor:', err);
                    interaction.editReply({ content: 'Failed to connect to Archipelago. Please check if the server is up.' });
                });
            }
            return;
        }
        switch (interaction.type) {
            case discord_js_1.InteractionType.ApplicationCommandAutocomplete:
                commands_1.default.Autocomplete(interaction);
                break;
            case discord_js_1.InteractionType.ApplicationCommand:
                commands_1.default.Execute(interaction);
                await database_1.default.createLog(interaction.guildId || '0', interaction.user.id, `Executed command ${interaction.commandName}`);
                break;
        }
    }
    catch (err) {
        console.error('Interaction error:', err);
        if (interaction.type === discord_js_1.InteractionType.ApplicationCommand) {
            if (interaction.replied || interaction.deferred) {
                interaction.followUp({ content: 'There was an error while executing this command!', flags: [discord_js_1.MessageFlags.Ephemeral] }).catch(() => { });
            }
            else {
                interaction.reply({ content: 'There was an error while executing this command!', flags: [discord_js_1.MessageFlags.Ephemeral] }).catch(() => { });
            }
        }
    }
});
client.on(discord_js_1.Events.GuildCreate, async (guild) => {
    await database_1.default.createLog(guild.id, '0', 'Added to guild');
    if (process.env.LOG_CHANNEL) {
        const channel = client.channels.cache.get(process.env.LOG_CHANNEL);
        if (channel?.isTextBased()) {
            channel.send(`Added to guild ${guild.name}`).catch(console.error);
        }
    }
});
client.on(discord_js_1.Events.GuildDelete, async (guild) => {
    await database_1.default.createLog(guild.id, '0', 'Removed from guild');
});
client.login(process.env.DISCORD_TOKEN);
