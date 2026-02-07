"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __importDefault(require("../classes/command"));
const discord_js_1 = require("discord.js");
const monitors_1 = __importDefault(require("../utils/monitors"));
class UnmonitorCommand extends command_1.default {
    constructor(client) {
        super();
        this.name = 'unmonitor';
        this.description = 'Stop tracking an archipelago session.';
        this.options = [
            { type: discord_js_1.ApplicationCommandOptionType.String, name: 'uri', description: 'The URI of the archipelago room to remove.', required: true, autocomplete: true }
        ];
        this.client = client;
    }
    execute(interaction) {
        const uri = interaction.options.getString('uri', true);
        // Do not remove if there is no monitor
        if (!monitors_1.default.has(uri)) {
            interaction.reply({ content: `There is no active monitor on ${uri}.`, flags: [discord_js_1.MessageFlags.Ephemeral] });
            return;
        }
        monitors_1.default.remove(uri);
        interaction.reply({ content: `The tracker will no longer track ${uri}.`, flags: [discord_js_1.MessageFlags.Ephemeral] });
    }
    autocomplete(interaction) {
        if (interaction.guildId == null)
            return;
        interaction.respond(monitors_1.default.get(interaction.guildId).map(monitor => ({ name: monitor.client.uri || '', value: monitor.client.uri || '' })));
    }
}
exports.default = UnmonitorCommand;
