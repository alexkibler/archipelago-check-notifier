"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const monitorcommand_1 = __importDefault(require("./commands/monitorcommand"));
const unmonitorcommand_1 = __importDefault(require("./commands/unmonitorcommand"));
const pingcommand_1 = __importDefault(require("./commands/pingcommand"));
const linkcommand_1 = __importDefault(require("./commands/linkcommand"));
const unlinkcommand_1 = __importDefault(require("./commands/unlinkcommand"));
const linkscommand_1 = __importDefault(require("./commands/linkscommand"));
const hintcommand_1 = __importDefault(require("./commands/hintcommand"));
let restClient;
const commandList = [];
const debugCommandList = [];
async function Init(client) {
    commandList.push(new pingcommand_1.default(client));
    commandList.push(new monitorcommand_1.default(client));
    commandList.push(new unmonitorcommand_1.default(client));
    commandList.push(new linkcommand_1.default(client));
    commandList.push(new unlinkcommand_1.default(client));
    commandList.push(new linkscommand_1.default(client));
    commandList.push(new hintcommand_1.default(client));
    if (client.token == null || client.application == null)
        return;
    restClient = new discord_js_1.REST({ version: '10' }).setToken(client.token);
    // Register slash commands with Discord.js rest
    if (process.env.GUILD_ID) {
        await restClient.put(discord_js_1.Routes.applicationGuildCommands(client.application?.id, process.env.GUILD_ID), { body: GetDebugCommands() });
    }
    await restClient.put(discord_js_1.Routes.applicationCommands(client.application?.id), { body: GetCommands() });
}
function GetCommands() {
    return commandList.map(command => ({ name: command.name, description: command.description, options: command.options }));
}
function GetDebugCommands() {
    return debugCommandList.map(command => ({ name: command.name, description: command.description, options: command.options }));
}
function Autocomplete(interaction) {
    const command = commandList.find(command => command.name === interaction.commandName);
    if (command == null)
        return;
    command.autocomplete(interaction);
}
function Execute(interaction) {
    const command = commandList.find(command => command.name === interaction.commandName);
    if (command == null)
        return;
    if (interaction.isChatInputCommand()) {
        command.execute(interaction);
    }
}
const Commands = {
    init: Init,
    GetCommands,
    Execute,
    Autocomplete
};
exports.default = Commands;
