const mongoose = require('mongoose');

const LogEntrySchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    service: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    level: {
        type: String,
        required: true,
        enum: ['info', 'warn', 'error', 'debug'],
        index: true
    },
    message: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    stack: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

LogEntrySchema.index({ timestamp: 1, service: 1, level: 1 });

LogEntrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('LogEntry', LogEntrySchema);
