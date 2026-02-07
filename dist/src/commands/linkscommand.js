"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __importDefault(require("../classes/command"));
const discord_js_1 = require("discord.js");
const database_1 = __importDefault(require("../utils/database"));
class LinksCommand extends command_1.default {
    constructor(client) {
        super();
        this.name = 'links';
        this.description = 'Show all linked Archipelago players in this server.';
        this.options = [];
        this.client = client;
    }
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: 'This command can only be used in a server.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        try {
            const links = await database_1.default.getLinks(interaction.guildId);
            if (links.length === 0) {
                return interaction.reply({ content: 'No players are currently linked in this server.', flags: [discord_js_1.MessageFlags.Ephemeral] });
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle('Linked Archipelago Players')
                .setDescription(links.map(link => `**${link.archipelago_name}**: <@${link.discord_id}>`).join('\n'))
                .setColor('#0099ff');
            interaction.reply({ embeds: [embed], flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
        catch (err) {
            console.error('Failed to get links:', err);
            interaction.reply({ content: 'Failed to retrieve links from database.', flags: [discord_js_1.MessageFlags.Ephemeral] });
        }
    }
}
exports.default = LinksCommand;
