import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },

    email: {
        type: String,
        requied: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },

    password: {
        type: String,
        required: [true, "Password is required"],
    },

    refreshToken: {
        type: String,
    },

}, { timestamps: true });


// Password hashing before save
userSchema.pre("save", async function (next: any) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});


userSchema.methods.isPasswordCorrect = async function (password: any) {
    return await bcrypt.compare(password, this.password);
};


userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET!,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
        }
    );
};


userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET!,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
        });
}