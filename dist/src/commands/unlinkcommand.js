"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __importDefault(require("../classes/command"));
const discord_js_1 = require("discord.js");
const database_1 = __importDefault(require("../utils/database"));
class UnlinkCommand extends command_1.default {
    constructor(client) {
        super();
        this.name = 'unlink';
        this.description = 'Unlink an Archipelago player name from a Discord user.';
        this.options = [
            {
                type: discord_js_1.ApplicationCommandOptionType.String,
                name: 'player',
                description: 'The Archipelago player name to unlink',
                required: true
            }
        ];
        this.client = client;
    }
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: 'This command can only be used in a server.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        const player = interaction.options.getString('player', true);
        try {
            await database_1.default.unlinkUser(interaction.guildId, player);
            interaction.reply({
                content: `Unlinked Archipelago player **${player}**.`,
                flags: [discord_js_1.MessageFlags.Ephemeral]
            });
        }
        catch (err) {
            console.error('Failed to unlink user:', err);
            interaction.reply({ content: 'Failed to unlink user in database.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
    }
}
exports.default = UnlinkCommand;
