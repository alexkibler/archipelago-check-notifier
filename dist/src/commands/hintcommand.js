"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __importDefault(require("../classes/command"));
const discord_js_1 = require("discord.js");
const database_1 = __importDefault(require("../utils/database"));
const monitors_1 = __importDefault(require("../utils/monitors"));
class HintCommand extends command_1.default {
    constructor(client) {
        super();
        this.name = 'hint';
        this.description = 'Request a hint for an item from the Archipelago server.';
        this.options = [
            {
                type: discord_js_1.ApplicationCommandOptionType.String,
                name: 'item',
                description: 'The item to request a hint for',
                required: true
            },
            {
                type: discord_js_1.ApplicationCommandOptionType.String,
                name: 'player',
                description: 'The player name to request as (defaults to your linked player)',
                required: false
            }
        ];
        this.client = client;
    }
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: 'This command can only be used in a server.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        const item = interaction.options.getString('item', true);
        let player = interaction.options.getString('player');
        // If player is not provided, try to find a link
        if (!player) {
            try {
                const links = await database_1.default.getLinks(interaction.guildId);
                const userLink = links.find(link => link.discord_id === interaction.user.id);
                if (userLink) {
                    player = userLink.archipelago_name;
                }
            }
            catch (err) {
                console.error('Failed to retrieve user links:', err);
                return interaction.reply({ content: 'An error occurred while checking your linked player.', flags: [discord_js_1.MessageFlags.Ephemeral] });
            }
        }
        if (!player) {
            return interaction.reply({ content: 'Could not determine which player to hint as. Please provide the `player` option or use `/link` to link your Discord account to an Archipelago player.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        // Find the active monitor for this player
        const guildMonitors = monitors_1.default.get(interaction.guildId);
        const activeMonitors = guildMonitors.filter(monitor => monitor.data.player === player);
        if (activeMonitors.length === 0) {
            return interaction.reply({ content: `No active Archipelago monitor found for player "**${player}**" in this server. The bot must be monitoring the session as this player to send hints.`, flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        if (activeMonitors.length > 1) {
            return interaction.reply({ content: `Multiple active monitors found for player "**${player}**". This is unexpected and unsupported. Please ensure only one session is monitored per player.`, flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        const monitor = activeMonitors[0];
        try {
            // Send the hint command to the Archipelago server
            monitor.client.say(`!hint ${item}`);
            console.log(`[Hint Command] User ${interaction.user.tag} (${interaction.user.id}) requested hint for "${item}" as player "${player}" in guild ${interaction.guildId}.`);
            interaction.reply({ content: `Hint request for "**${item}**" sent to Archipelago as player "**${player}**".`, flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        catch (err) {
            console.error('Failed to send hint request:', err);
            interaction.reply({ content: 'Failed to send hint request to the Archipelago server.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
    }
}
exports.default = HintCommand;
