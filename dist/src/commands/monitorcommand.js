"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __importDefault(require("../classes/command"));
const discord_js_1 = require("discord.js");
const monitors_1 = __importDefault(require("../utils/monitors"));
const database_1 = __importDefault(require("../utils/database"));
class MonitorCommand extends command_1.default {
    constructor(client) {
        super();
        this.name = 'monitor';
        this.description = 'Start tracking an archipelago session.';
        this.options = [
            { type: discord_js_1.ApplicationCommandOptionType.String, name: 'host', description: 'The host to use', required: true },
            { type: discord_js_1.ApplicationCommandOptionType.Integer, name: 'port', description: 'The port to use', required: true },
            { type: discord_js_1.ApplicationCommandOptionType.String, name: 'game', description: 'The game to monitor', required: true },
            { type: discord_js_1.ApplicationCommandOptionType.String, name: 'player', description: 'The player to monitor', required: true },
            { type: discord_js_1.ApplicationCommandOptionType.Channel, channelTypes: [discord_js_1.ChannelType.GuildText], name: 'channel', description: 'The channel to send messages to', required: true },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_join_leave', description: 'Whether to @ people for joining or leaving (default: false)', required: false },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_item_finder', description: 'Whether to @ people when they find an item (default: true)', required: false },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_item_receiver', description: 'Whether to @ people when they receive an item (default: true)', required: false },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_completion', description: 'Whether to @ people when they complete their goal (default: true)', required: false },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_hints', description: 'Whether to @ people when they are mentioned in a hint (default: true)', required: false }
        ];
        this.client = client;
    }
    validate(interaction) {
        const host = interaction.options.getString('host', true);
        // regex for domain or IP address - eg. archipelago.gg
        const hostRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
        if (!hostRegex.test(host)) {
            interaction.reply({ content: 'Invalid host name format. Please use domain name (e.g: archipelago.gg)', flags: [discord_js_1.MessageFlags.Ephemeral] });
            return false;
        }
        const channel = interaction.options.getChannel('channel', true);
        if (channel == null)
            return false;
        // Only add to channels in this guild
        if (interaction.guild?.channels.cache.get(channel.id) == null)
            return false;
        return true;
    }
    execute(interaction) {
        // Validate text input.
        if (!this.validate(interaction))
            return;
        const monitorData = {
            game: interaction.options.getString('game', true),
            player: interaction.options.getString('player', true),
            host: interaction.options.getString('host', true),
            port: interaction.options.getInteger('port', true),
            channel: interaction.options.getChannel('channel', true).id,
            mention_join_leave: interaction.options.getBoolean('mention_join_leave') ?? false,
            mention_item_finder: interaction.options.getBoolean('mention_item_finder') ?? true,
            mention_item_receiver: interaction.options.getBoolean('mention_item_receiver') ?? true,
            mention_completion: interaction.options.getBoolean('mention_completion') ?? true,
            mention_hints: interaction.options.getBoolean('mention_hints') ?? true
        };
        // Only allow one monitor per host/port/player combo
        if (monitors_1.default.has(`${monitorData.host}:${monitorData.port}`)) {
            return interaction.reply({ content: 'Already monitoring that host!', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        // Send a message to the channel to confirm the monitor has been added.
        const textChannel = this.client.channels.cache.get(monitorData.channel);
        if (textChannel?.isTextBased()) {
            textChannel.send('This monitor will now track Archipelago on this channel.').catch(console.error);
        }
        else {
            return interaction.reply({ content: 'Could not find the specified channel in cache or it is not text-based.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        // Make the monitor and save it
        monitors_1.default.make(monitorData, this.client).then(async (monitor) => {
            monitor.data.id = await database_1.default.makeConnection(monitorData);
        }).catch(err => {
            console.error('Failed to create monitor:', err);
            interaction.followUp({ content: 'Failed to connect to Archipelago. Please check host and port.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        });
        interaction.reply({ content: `Now monitoring Archipelago on ${monitorData.host}:${monitorData.port}.`, flags: [discord_js_1.MessageFlags.Ephemeral] });
    }
}
exports.default = MonitorCommand;
