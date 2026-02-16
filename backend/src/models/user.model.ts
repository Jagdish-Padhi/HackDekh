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
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
});



userSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
};


userSchema.methods.generateAccessToken = function (): string {
    const secret = process.env.ACCESS_TOKEN_SECRET || "";
    const expiresIn = process.env.ACCESS_TOKEN_EXPIRY || "1d";
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
        },
        secret,
        ({ expiresIn: expiresIn } as any)
    );
};


userSchema.methods.generateRefreshToken = function (): string {
    const secret = process.env.REFRESH_TOKEN_SECRET || "";
    const expiresIn = process.env.REFRESH_TOKEN_EXPIRY || "7d";
    return jwt.sign(
        {
            _id: this._id,
        },
        secret,
        ({ expiresIn: expiresIn } as any)
    );
};

const User = mongoose.model('User', userSchema);
export { User };