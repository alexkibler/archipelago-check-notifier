# Archipelago Check Notifier

A Discord bot that monitors Archipelago multiworld randomizer sessions and posts real-time notifications to Discord channels when items are sent, received, or found.

## Features

- **Player-Specific Monitoring**: Each player gets their own monitor with filtered notifications
- **Multi-Player Support**: Multiple players can monitor the same AP server simultaneously
- **Guild Server Linking**: Set a default AP server for your Discord server (no need to specify host/port every time)
- **Smart Hint System**: Request hints with dynamic item autocomplete
- **User Linking**: Link Discord users to Archipelago player names for @mentions
- **Customizable Notifications**: Control mentions for items found, received, goals, hints, and join/leave events
- **Docker Support**: Easy deployment with Docker Compose on any platform (including ARM devices)

## Prerequisites

- A [Discord account](https://discord.com) with a server you can add bots to
- A machine with [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

## Setup Instructions

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name
3. On the **General Information** page, copy the **Application ID** (this is your `CLIENT_ID`)
4. Go to the **Bot** tab:
   - Click **Reset Token** and copy the token (save it securely!)
   - Under **Privileged Gateway Intents**, enable **Message Content Intent**
5. Go to **OAuth2 → URL Generator**:
   - Select scopes: `bot` and `applications.commands`
   - Select bot permissions: `Send Messages`, `Embed Links`, `Mention Everyone`, `Read Message History`
6. Copy the generated URL and open it in your browser to invite the bot to your server

### 2. Get Your Discord Server ID

1. In Discord, go to **User Settings → Advanced**
2. Enable **Developer Mode**
3. Right-click your server name in the sidebar
4. Click **Copy Server ID**

### 3. Deploy with Docker Compose

1. Clone this repository and navigate into the directory.
2. Create a `docker-compose.yml` file with the following content:

```yaml
services:
  archipelago-bot:
    build: .
    container_name: archipelago-bot
    restart: unless-stopped
    volumes:
      - ./data:/data
    environment:
      - DISCORD_TOKEN=your_discord_bot_token_here
      - CLIENT_ID=your_discord_client_id_here
      - GUILD_ID=your_discord_guild_id_here
      - DB_PATH=/data/database.sqlite
```

3. Replace the placeholder values in `environment`:
    - `DISCORD_TOKEN`: Your Discord Bot Token (from Step 1)
    - `CLIENT_ID`: Your Discord Application Client ID
    - `GUILD_ID`: Your Discord Server ID (from Step 2)

4. Run the bot:

```bash
docker-compose up -d
```

The bot should now be online in your server.

---

## Usage Guide

### Initial Setup (One-Time)

#### 1. Set Default AP Server (Admin Only)

If your Discord server always plays on the same Archipelago instance, set it as the default:

```
/set-server host:archipelago.gg port:38281
```

**Permission required**: Manage Server

This allows players to use `/monitor` without specifying host/port every time!

#### 2. Link Your Discord Account

Link your Discord user to your Archipelago player name:

```
/link player:YourAPPlayerName
```

This enables:
- @mentions when you receive items
- Automatic player detection in `/hint`
- Personalized notifications

### Monitoring Sessions

#### Start Monitoring

If your admin set a default server:
```
/monitor game:YAYARG player:KiddblurYARG channel:#archipelago
```

For a different server (overrides default):
```
/monitor game:ALTTP player:Link host:other.server.gg port:12345 channel:#ap
```

**What gets monitored:**
- Items YOU send to others
- Items YOU receive from others
- Items YOU find/collect
- Goal completion
- Connection events (optional)

**Important:** Each player needs their own monitor. Multiple players on the same server can each run `/monitor` with their own player name.

#### Stop Monitoring

```
/unmonitor
```

Select your monitor from the dropdown (shows as `host:port - PlayerName (Game)`).

### Using Hints

Request hints for items you're looking for:

```
/hint item:Master Sword
```

**Features:**
- **Autocomplete**: Start typing and see all available items for your game
- **Auto-detection**: Uses your linked player automatically
- **Works with monitors**: Uses your active monitor's connection

If you don't have a monitor running, you can provide connection details:
```
/hint item:Hookshot player:Link host:archipelago.gg port:38281 game:ALTTP
```

### Managing Links

#### View All Links
```
/links
```

Shows all Discord↔Archipelago player links in your server.

#### Remove a Link
```
/unlink player:PlayerName
```

### Advanced: Notification Settings

When using `/monitor` or `/link`, you can customize @mention behavior:

```
/monitor game:YAYARG player:Mini channel:#ap
  mention_item_finder:true
  mention_item_receiver:true
  mention_completion:true
  mention_hints:true
  mention_join_leave:false
```

**Options:**
- `mention_item_finder`: Mention when you find/send an item (default: true)
- `mention_item_receiver`: Mention when you receive an item (default: true)
- `mention_completion`: Mention when you complete your goal (default: true)
- `mention_hints`: Mention in hint responses (default: true)
- `mention_join_leave`: Mention when you join/leave (default: false)

---

## Commands Reference

| Command | Description | Required Role |
|---------|-------------|---------------|
| `/set-server` | Set default AP server for guild | Manage Server |
| `/monitor` | Start monitoring your AP slot | Everyone |
| `/unmonitor` | Stop monitoring | Everyone |
| `/link` | Link Discord to AP player name | Everyone |
| `/unlink` | Remove player link | Everyone |
| `/links` | View all links | Everyone |
| `/hint` | Request item hint with autocomplete | Everyone |

---

## Troubleshooting

**No autocomplete in `/hint`?**
- Make sure you have an active monitor running
- Make sure you're linked with `/link`

**Can't use `/monitor` without host/port?**
- Ask your server admin to use `/set-server` first

**Not getting notifications?**
- Verify your monitor is active with `/unmonitor` (you should see it in the list)
- Check that you specified the correct player name (case-sensitive!)
- Ensure the bot has permission to send messages in the notification channel

**Multiple players on same server?**
- Each player runs their own `/monitor` command with their own player name
- Monitors are now per-player, not per-server!

---

## Building Locally

```bash
docker build -t archipelago-bot .
```

---

## License

See the original repository for license information.
