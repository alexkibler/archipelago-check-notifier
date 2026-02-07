"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Command {
    execute(interaction) {
        console.log('Command executed');
    }
    autocomplete(interaction) {
        console.log('Command autocompleted');
    }
}
exports.default = Command;
