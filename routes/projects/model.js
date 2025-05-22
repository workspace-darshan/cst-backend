const mongoose = require("mongoose");
const { normalizeImagePath } = require("../../services/utils");

const projectSchema = new mongoose.Schema(
    {
        client: {
            type: String,
            required: true,
        },
        projectTitle: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        images: [{
            type: String,
        }]
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Project", projectSchema);
