const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
        posterImg: {
            type: String,
        },
        sections: [{
            heading: {
                type: String,
                required: true
            },
            description: {
                type: String,
            },
            points: [{
                type: String,
            }],
            images: [{
                type: String,
            }]
        }],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Service", serviceSchema);
