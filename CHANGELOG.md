# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-02-02

### Added
- Configurable mention flags for `/monitor` command:
    - `mention_join_leave`: Toggle mentions for joining/leaving (default: false).
    - `mention_item_finder`: Toggle mentions for the player who finds an item (default: true).
    - `mention_item_receiver`: Toggle mentions for the player who receives an item (default: true).
    - `mention_completion`: Toggle mentions for goal completion (default: true).
    - `mention_hints`: Toggle mentions for players named in hints (default: true).
- Support for `Goal` (completion) and `Release` notification types.
- Automatic database migration for new configuration columns.

### Changed
- Improved mention logic to distinguish between item finders and receivers.

## [1.2.0] - 2026-02-02

### Added
- Player linking functionality: Link Discord users to Archipelago player names to receive @mentions in notifications.
- New slash commands:
    - `/link` - Associate an Archipelago player name with a Discord user.
    - `/unlink` - Remove a link.
    - `/links` - List all active links in the server.
- Mention collection logic: The bot now extracts Discord mentions from notification text and includes them in the message content to ensure users are actually pinged (as mentions inside embeds do not trigger pings).

### Changed
- Refactored `Monitor` class to support asynchronous lookups for player links.

## [1.1.3] - 2026-02-02

### Fixed
- Resolved Railway build failure caused by ESLint 9 peer dependency conflicts.
- Added dependency overrides in `package.json` to support ESLint 9 with legacy configs.
- Upgraded `eslint-plugin-n` to v17 and `eslint-plugin-import` to v2.31 for ESLint 9 compatibility.

## [1.1.2] - 2026-02-02

### Changed
- Migrated ESLint from v8 to v9 to address security vulnerability (GHSA-p5wg-g6qr-c7cg).
- Updated configuration to flat config format (`eslint.config.mjs`).
- Updated `@typescript-eslint` plugins to v8.
- Added `undici` override to v6.23.0+ to resolve GHSA-g9mf-h72j-4rw9.

## [1.1.1] - 2026-02-02

### Changed
- Updated Archipelago protocol version to 0.5.0 to support modern servers (e.g., archipelago.gg).
- Replaced deprecated `ephemeral: true` with `flags: [MessageFlags.Ephemeral]` for Discord interaction responses.

## [1.1.0] - 2026-02-02

### Added
- Database migration and command initialization error handling during startup to prevent crash loops.
- Global interaction error handler to gracefully report failures to users instead of crashing the process.
- Database error logging for failed operations in `src/utils/database.ts`.
- Comprehensive validation for Discord channels in the `Monitor` constructor.

### Changed
- Updated Discord interactions to use `ChatInputCommandInteraction` for type-safe option retrieval.
- Refactored slash command registration to use proper descriptions from command classes.
- Enhanced `Monitor` class to handle `TextBasedChannel` union types safely in Discord.js v14.
- Improved `MonitorCommand` validation logic and error reporting.
- Cleaned up codebase by removing unused imports and redundant semicolons.

### Fixed
- Bot crash when `GUILD_ID` environment variable is not provided.
- Unsafe Discord cache access in `MonitorCommand` that led to `TypeError` crashes.
- Bug in duplicate monitor check that incorrectly compared player names instead of connection details.
- Error in `Monitors.make` where connection failures were not properly rejecting the promise.
- TypeScript compilation and ESLint warnings across the project.

## [1.0.0] - 2026-02-01

### Added
- Initial support for Railway deployment.
- Migration to `mysql2` for MySQL 8 compatibility.
- Environment variable support for configuration (`DISCORD_TOKEN`, `GUILD_ID`, etc.).
- Basic Archipelago monitoring and Discord notification functionality.
- Slash commands for `/monitor`, `/unmonitor`, and `/ping`.
