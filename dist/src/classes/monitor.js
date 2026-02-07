"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const archipelago_js_1 = require("archipelago.js");
const randohelper_1 = __importDefault(require("../utils/randohelper"));
const database_1 = __importDefault(require("../utils/database"));
class Monitor {
    stop() {
        this.isActive = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.client.disconnect();
    }
    convertData(message, linkMap) {
        return message.data.map((slot) => {
            switch (slot.type) {
                case 'player_id': {
                    const playerId = parseInt(slot.text);
                    const playerName = this.client.players.get(playerId)?.name;
                    const link = playerName ? linkMap.get(playerName) : null;
                    if (link) {
                        let shouldMention = true;
                        if (message.type === 'ItemSend') {
                            if (playerId === message.receiving) {
                                shouldMention = this.data.mention_item_receiver && link.mention_item_receiver;
                            }
                            else {
                                shouldMention = this.data.mention_item_finder && link.mention_item_finder;
                            }
                        }
                        else if (message.type === 'Hint') {
                            shouldMention = this.data.mention_hints && link.mention_hints;
                        }
                        else if (message.type === 'Collect') {
                            shouldMention = this.data.mention_item_finder && link.mention_item_finder;
                        }
                        if (shouldMention) {
                            return `<@${link.discord_id}>`;
                        }
                    }
                    return `**${playerName}**`;
                }
                case 'item_id':
                    return `*${randohelper_1.default.getItem(this.client, slot.player, parseInt(slot.text), slot.flags)}*`;
                case 'location_id':
                    return `**${randohelper_1.default.getLocation(this.client, slot.player, parseInt(slot.text))}**`;
                default:
                    return slot.text;
            }
        }).join(' ');
    }
    addQueue(message, type = 'hints') {
        if (this.queue.hints.length === 0 && this.queue.items.length === 0)
            setTimeout(() => this.sendQueue(), 150);
        switch (type) {
            case 'hints':
                this.queue.hints.push(message);
                break;
            case 'items':
                this.queue.items.push(message);
                break;
        }
    }
    sendQueue() {
        const hints = this.queue.hints.map((message, index) => ({ name: `#${index + 1}`, value: message }));
        this.queue.hints = [];
        // split into multiple messages if there are too many items
        while (hints.length > 0) {
            const batch = hints.splice(0, 25);
            const mentions = new Set();
            const regex = /<@(\d+)>/g;
            batch.forEach(f => {
                let match;
                while ((match = regex.exec(f.value)) !== null) {
                    mentions.add(match[1]);
                }
            });
            const content = mentions.size > 0 ? Array.from(mentions).map(id => `<@${id}>`).join(' ') : undefined;
            const embed = new discord_js_1.EmbedBuilder().setTitle('Hints').addFields(batch).data;
            this.channel.send({ content, embeds: [embed] }).catch(console.error);
        }
        const items = this.queue.items.map((message, index) => ({ name: `#${index + 1}`, value: message }));
        this.queue.items = [];
        // split into multiple messages if there are too many items
        while (items.length > 0) {
            const batch = items.splice(0, 25);
            const mentions = new Set();
            const regex = /<@(\d+)>/g;
            batch.forEach(f => {
                let match;
                while ((match = regex.exec(f.value)) !== null) {
                    mentions.add(match[1]);
                }
            });
            const content = mentions.size > 0 ? Array.from(mentions).map(id => `<@${id}>`).join(' ') : undefined;
            const embed = new discord_js_1.EmbedBuilder().setTitle('Items').addFields(batch).data;
            this.channel.send({ content, embeds: [embed] }).catch(console.error);
        }
    }
    send(message, components) {
        // make an embed for the message
        const embed = new discord_js_1.EmbedBuilder().setDescription(message).setTitle('Archipelago');
        const mentions = new Set();
        const regex = /<@(\d+)>/g;
        let match;
        while ((match = regex.exec(message)) !== null) {
            mentions.add(match[1]);
        }
        const content = mentions.size > 0 ? Array.from(mentions).map(id => `<@${id}>`).join(' ') : undefined;
        this.channel.send({ content, embeds: [embed.data], components }).catch(console.error);
    }
    constructor(client, monitorData, discordClient) {
        this.isActive = true;
        this.reconnectTimeout = null;
        this.queue = {
            hints: [],
            items: []
        };
        this.client = client;
        this.data = monitorData;
        const channel = discordClient.channels.cache.get(monitorData.channel);
        if (!channel || !channel.isTextBased() || !(channel instanceof discord_js_1.GuildChannel)) {
            throw new Error(`Channel ${monitorData.channel} not found, is not text-based, or is not a guild channel.`);
        }
        this.channel = channel;
        this.guild = channel.guild;
        client.addListener(archipelago_js_1.SERVER_PACKET_TYPE.CONNECTION_REFUSED, this.onDisconnect.bind(this));
        client.on?.('disconnected', this.onDisconnect.bind(this));
        client.addListener(archipelago_js_1.SERVER_PACKET_TYPE.PRINT_JSON, this.onJSON.bind(this));
    }
    onDisconnect() {
        if (!this.isActive || this.isReconnecting)
            return;
        this.isReconnecting = true;
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`remonitor:${this.data.id}`)
            .setLabel('Re-monitor')
            .setStyle(discord_js_1.ButtonStyle.Primary));
        this.send('Disconnected from the server.', [row]);
        this.reconnect();
    }
    reconnect() {
        if (!this.isActive)
            return;
        this.client.connect({
            game: this.data.game,
            hostname: this.data.host,
            port: this.data.port,
            name: this.data.player,
            items_handling: archipelago_js_1.ITEMS_HANDLING_FLAGS.REMOTE_ALL,
            version: { major: 0, minor: 5, build: 0 }
        }).then(() => {
            this.isReconnecting = false;
        }).catch(() => {
            if (!this.isActive)
                return;
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.reconnect();
            }, 300000);
        });
    }
    // When a message is received from the server
    async onJSON(packet) {
        if (!this.isActive)
            return;
        const links = await database_1.default.getLinks(this.guild.id);
        const linkMap = new Map(links.map(l => [l.archipelago_name, l]));
        const formatPlayer = (slot, monitorMentionFlag = true, flagName) => {
            const playerName = this.client.players.get(slot)?.name;
            const link = playerName ? linkMap.get(playerName) : null;
            if (link) {
                let shouldMention = monitorMentionFlag;
                if (flagName && link[flagName] !== undefined) {
                    shouldMention = shouldMention && link[flagName];
                }
                if (shouldMention) {
                    return `<@${link.discord_id}>`;
                }
            }
            return `**${playerName}**`;
        };
        switch (packet.type) {
            case 'Collect':
            case 'ItemSend':
                this.addQueue(this.convertData(packet, linkMap), 'items');
                break;
            case 'Hint':
                this.addQueue(this.convertData(packet, linkMap), 'hints');
                break;
            case 'Join':
                // Overrides for special join messages
                if (packet.tags?.includes('Monitor'))
                    return;
                if (packet.tags?.includes('IgnoreGame')) {
                    this.send(`A tracker for ${formatPlayer(packet.slot, this.data.mention_join_leave, 'mention_join_leave')} has joined the game!`);
                    return;
                }
                this.send(`${formatPlayer(packet.slot, this.data.mention_join_leave, 'mention_join_leave')} (${this.client.players.get(packet.slot)?.game}) joined the game!`);
                break;
            case 'Part':
                this.send(`${formatPlayer(packet.slot, this.data.mention_join_leave, 'mention_join_leave')} (${this.client.players.get(packet.slot)?.game}) left the game!`);
                break;
            case 'Goal':
                this.send(`${formatPlayer(packet.slot, this.data.mention_completion, 'mention_completion')} has completed their goal!`);
                break;
            case 'Release':
                this.send(`${formatPlayer(packet.slot, this.data.mention_item_finder, 'mention_item_finder')} has released their remaining items!`);
                break;
        }
    }
}
exports.default = Monitor;
