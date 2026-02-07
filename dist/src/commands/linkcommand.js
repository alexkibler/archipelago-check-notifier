"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __importDefault(require("../classes/command"));
const discord_js_1 = require("discord.js");
const database_1 = __importDefault(require("../utils/database"));
class LinkCommand extends command_1.default {
    constructor(client) {
        super();
        this.name = 'link';
        this.description = 'Link an Archipelago player name to a Discord user.';
        this.options = [
            {
                type: discord_js_1.ApplicationCommandOptionType.String,
                name: 'player',
                description: 'The Archipelago player name',
                required: true
            },
            {
                type: discord_js_1.ApplicationCommandOptionType.User,
                name: 'user',
                description: 'The Discord user to link (defaults to you)',
                required: false
            },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_join_leave', description: 'Whether to @ you for joining or leaving (default: false)', required: false },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_item_finder', description: 'Whether to @ you when you find an item (default: true)', required: false },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_item_receiver', description: 'Whether to @ you when you receive an item (default: true)', required: false },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_completion', description: 'Whether to @ you when you complete your goal (default: true)', required: false },
            { type: discord_js_1.ApplicationCommandOptionType.Boolean, name: 'mention_hints', description: 'Whether to @ you when you are mentioned in a hint (default: true)', required: false }
        ];
        this.client = client;
    }
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: 'This command can only be used in a server.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        const player = interaction.options.getString('player', true);
        const user = interaction.options.getUser('user') || interaction.user;
        const flags = {
            mention_join_leave: interaction.options.getBoolean('mention_join_leave') ?? false,
            mention_item_finder: interaction.options.getBoolean('mention_item_finder') ?? true,
            mention_item_receiver: interaction.options.getBoolean('mention_item_receiver') ?? true,
            mention_completion: interaction.options.getBoolean('mention_completion') ?? true,
            mention_hints: interaction.options.getBoolean('mention_hints') ?? true
        };
        try {
            await database_1.default.linkUser(interaction.guildId, player, user.id, flags);
            interaction.reply({
                content: `Linked Archipelago player **${player}** to <@${user.id}>. Notifications involving this player will now mention them.`,
                flags: [discord_js_1.MessageFlags.Ephemeral]
            });
        }
        catch (err) {
            console.error('Failed to link user:', err);
            interaction.reply({ content: 'Failed to link user in database.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
    }
}
exports.default = LinkCommand;
