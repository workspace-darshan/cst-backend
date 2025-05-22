const { handleError } = require("../services/utils");

const isAdmin = async (req, res, next) => {
    console.log("req.user", req.user)
    try {
        if (!req.user.isAdmin) {
            return handleError(res, "Access denied. Admin only.", 403);
        }
        next();
    } catch (error) {
        return handleError(res, "Admin authorization failed", 401);
    }
};

module.exports = isAdmin;
