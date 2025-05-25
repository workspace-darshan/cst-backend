const { handleError, handleSuccess } = require("../../services/utils");
const ProjectModel = require("../projects/model");
const ServiceModel = require("../services/model");
const UserModel = require("../users/model");

exports.getCommon = async (req, res) => {
    try {
        const [projects, services, userCount,] = await Promise.all([
            ProjectModel.find().sort({ createdAt: -1 }),
            ServiceModel.find().sort({ createdAt: -1 }),
            UserModel.countDocuments(),
        ]);

        return handleSuccess(
            res,
            { projects, services, userCount },
            "Projects, services, and user count fetched successfully"
        );
    } catch (err) {
        console.error(err);
        return handleError(res, "Error fetching data", 500, err.message);
    }
};
