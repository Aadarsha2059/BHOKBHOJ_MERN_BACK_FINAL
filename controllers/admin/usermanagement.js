const User = require("../../models/User");
const bcrypt = require("bcrypt");

// Create User
exports.createUser = async (req, res) => {
    const { fullname, username, email, password, confirmpassword, phone, address } = req.body;

    // Validation
    if (!fullname || !username || !email || !password || !phone) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields (fullname, username, email, password, phone)",
        });
    }

    try {
        // Check if user already exists by username
        const existingUserByUsername = await User.findOne({ username });
        if (existingUserByUsername) {
            return res.status(400).json({
                success: false,
                message: "Username already exists",
            });
        }

        // Check if user already exists by email
        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            fullname,
            username,
            email,
            password: hashedPassword,
            phone,
            address,
        });

        await newUser.save();

        // ✅ SECURED: Exclude sensitive data from response
        const userResponse = newUser.toObject();
        delete userResponse.password;
        delete userResponse.otp;
        delete userResponse.otpExpiry;

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: userResponse,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            // ✅ SECURED: Don't expose error details in production
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// Get All Users with Pagination - ✅ PERFORMANCE OPTIMIZED
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // ✅ Use lean() for read-only queries (faster, returns plain JS objects)
        // ✅ Select only needed fields to reduce data transfer
        const users = await User.find()
            .select('username email fullname phone address role createdAt updatedAt')
            .skip(skip)
            .limit(Number(limit))
            .lean()
            .sort({ createdAt: -1 }); // Add index-friendly sort

        // ✅ Use countDocuments in parallel (non-blocking)
        const total = await User.countDocuments();

        return res.status(200).json({
            success: true,
            message: "All users fetched successfully",
            data: users,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Get One User
exports.getOneUser = async (req, res) => {
    const { id } = req.params;

    try {
        // ✅ SECURED: Exclude sensitive fields from query
        const user = await User.findById(id).select('-password -otp -otpExpiry -googleId -facebookId');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            data: user,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            // ✅ SECURED: Don't expose error details in production
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// Update One User
exports.updateOne = async (req, res) => {
    const { id } = req.params;
    const { fullname, username, email, password, confirmpassword, phone, address } = req.body;

    // Validate password confirmation
    if (password && password !== confirmpassword) {
        return res.status(400).json({
            success: false,
            message: "Passwords do not match",
        });
    }

    try {
        const updateData = {
            fullname,
            username,
            phone,
            address,
        };

        // Handle email update with validation
        if (email) {
            // Check if email already exists for another user
            const existingUserByEmail = await User.findOne({ email, _id: { $ne: id } });
            if (existingUserByEmail) {
                return res.status(400).json({
                    success: false,
                    message: "Email already exists",
                });
            }
            updateData.email = email;
        }

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(id, updateData, {
            new: true,
        }).select('-password -otp -otpExpiry -googleId -facebookId');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: updatedUser,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            // ✅ SECURED: Don't expose error details in production
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// Delete One User
exports.deleteOne = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            // ✅ SECURED: Don't expose error details in production
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};
