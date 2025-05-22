const { handleError, handleSuccess } = require("../../services/utils");
const UserModel = require("./model");

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!email || !password) {
            return handleError(res, "Email and password are required.", 400);
        }

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return handleError(res, "Email already exists", 400);
        }

        const user = new UserModel({
            name,
            email,
            password,
        });
        await user.save();
        return handleSuccess(
            res,
            user,
            "User registered successfully",
            201
        );
    } catch (err) {
        console.error(err);
        return handleError(
            res,
            "An error occurred during registration",
            500,
            err.message
        );
    }
}

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return handleError(res, "Email and password are required.", 400);
    }
    try {
        const user = await UserModel.findOne({
            email: email
        });
        if (!user) {
            return handleError(res, "No user found with this email/mobile.", 404);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return handleError(res, "Invalid credentials", 401);
        }

        const token = await user.generateToken();
        const responseUser = user.toObject();

        delete responseUser.password;

        return handleSuccess(res, {
            token,
            user: responseUser,
        },
            "Login successful!"
        );
    } catch (err) {
        console.error(err);
        return handleError(
            res,
            "An error occurred during login",
            500,
            err.message
        );
    }
}

exports.getMe = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user?.userId).select("-password");
        if (!user) {
            return handleError(res, "User not found", 404);
        }
        return handleSuccess(res, user, "User profile fetched successfully");
    } catch (error) {
        console.error("getMe error:", error);
        return handleError(
            res,
            "An error occurred while getMe",
            500,
            error.message
        );
    }
};


exports.logout = (req, res) => {
    try {
        // res.clearCookie("token", {
        //     httpOnly: true,
        //     secure: true,
        //     sameSite: "None",
        // });

        return handleSuccess(res, "Logged out successfully");
    } catch (error) {
        console.error("logout error:", error);
        return handleError(
            res,
            "An error occurred while logout",
            500,
            error.message
        );
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.find()
            .select("-password")
            .sort({ createdAt: -1 });
        return handleSuccess(res, { count: users.length, users }, "Users fetched successfully.");
    } catch (error) {
        console.error("Get all users error:", error);
        return handleError(
            res,
            "An error occurred while fetching users",
            500,
            error.message
        );
    }
}

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UserModel.findById(id).select("-password");

        if (!user) {
            return handleError(res, "User not found", 404);
        }
        return handleSuccess(res, user, "User fetched successfully.");
    } catch (error) {
        console.error("Get user error:", error);
        return handleError(
            res,
            "An error occurred while fetching the user",
            500,
            error.message
        );
    }
}

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params
        const updateData = req.body;

        const user = await UserModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );
        if (!user) {
            return handleError(res, "User not found", 404);
        }
        return handleSuccess(res, user, "User updated successfully");
    } catch (error) {
        console.error("Update user error:", error);
        return handleError(
            res,
            "An error occurred while updating the user",
            500,
            error.message
        );
    }
}

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params
        const user = await UserModel.findByIdAndDelete(id);
        if (!user) {
            return handleError(res, "User not found", 404);
        }
        return handleSuccess(res, user, "User Deleted successfully");
    } catch (error) {
        console.error("Delete user error:", error);
        return handleError(
            res,
            "An error occurred while Deleting the user",
            500,
            error.message
        );
    }
}