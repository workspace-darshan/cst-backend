const mongoose = require("mongoose");
const { normalizeImagePath } = require("../../services/utils");

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
        sections: [{
            subheading: {
                type: String,
                required: true
            },
            description: {
                type: String,
                required: true
            },
            points: [{
                description: {
                    type: String,
                    required: true
                }
            }],
            _id: false
        }],
        images: [{
            type: String,
        }]
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Service", serviceSchema);
