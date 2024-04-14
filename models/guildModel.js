const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
    },
    lang: {
        type: String,
        required: true,
        default: 'en',
    },
    settings: {
        statusId: {
        type: String,
        },
        statusIdDb: {
        type: String,
        },
        statusChannelId: {
        type: String,
        },
        lastOutageTimestamp: Number,
    },
});

module.exports = mongoose.model('Guild', guildSchema);