# Archipelago Check Notifier - Self-Hosting Guide

A Discord bot that monitors Archipelago multiworld randomizer sessions and posts notifications to Discord channels when checks are found.

## Overview

This bot connects to Archipelago multiworld servers and notifies a Discord channel whenever a player finds a check. It's useful for collaborative gaming sessions where players want to track progress across multiple games.

This version has been updated to support self-hosting with Docker and SQLite, making it easy to run on your own hardware (including ARM devices like Mac Mini or Raspberry Pi).

## Features

- Monitor Archipelago sessions for check notifications
- Link Discord users to Archipelago player names for targeted mentions
- Request hints directly from Discord via `/hint`
- Customizable notification settings (items found, received, goal completion, hints, etc.)

## Prerequisites

- A [Discord account](https://discord.com) with a server you can add bots to
- A machine with [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

## Setup Instructions

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name.
3. On the **General Information** page, copy the **Application ID** (this is your `CLIENT_ID`).
4. Go to the **Bot** tab:
    - Click **Reset Token** and copy the token (save it securely - you'll need it later)
    - Under **Privileged Gateway Intents**, enable **Message Content Intent**
5. Go to **OAuth2 → URL Generator**:
    - Select scopes: `bot` and `applications.commands`
    - Select bot permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
5. Copy the generated URL and open it in your browser to invite the bot to your server

### 2. Get Your Discord Server ID

1. In Discord, go to **User Settings → Advanced**
2. Enable **Developer Mode**
3. Right-click your server name in the sidebar
4. Click **Copy Server ID**

### 3. Deploy with Docker Compose

1. Create a directory for your bot and navigate into it.
2. Create a `docker-compose.yml` file with the following content:

```yaml
services:
  archipelago-bot:
    image: ghcr.io/matthe815s-projects/archipelago-check-notifier:latest
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

## Bot Commands

- `/monitor` - Start monitoring an Archipelago session.
    - `host`: The Archipelago server address (e.g., `archipelago.gg`)
    - `port`: The port number
    - `game`: The game name
    - `player`: The player name to monitor
    - `channel`: The channel to post notifications in
- `/unmonitor` - Stop monitoring a session.
- `/link` - Link an Archipelago player name to your Discord user.
- `/unlink` - Remove a link.
- `/links` - Show all links in the server.
- `/hint` - Request a hint from the Archipelago server.
    - `item`: The item to hint for (required)
    - `player`: The player name to request as (optional, defaults to linked player)

## Building Locally

If you want to build the Docker image yourself:

```bash
docker build -t archipelago-bot .
```

## License

See the original repository for license information.
