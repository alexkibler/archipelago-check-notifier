"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __importDefault(require("../classes/command"));
const discord_js_1 = require("discord.js");
class PingCommand extends command_1.default {
    constructor(client) {
        super();
        this.name = 'ping';
        this.description = 'Test the bot\'s responsiveness by a ping.';
        this.options = [];
        this.client = client;
    }
    execute(interaction) {
        interaction.reply({ content: 'Pong!', flags: [discord_js_1.MessageFlags.Ephemeral] });
    }
}
exports.default = PingCommand;
