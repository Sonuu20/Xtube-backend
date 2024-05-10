import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    username: {
        type: String, 
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true  //index mongodb searching field me kaam aata h
    },
    email: {
        type: String, 
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String, 
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,  //cloudinary url
        required: true,     
    },
    coverImg: {
        type: String, //cloudinary url
    },
    watchHistory : [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken : {
        type: String
    }
}, {timestamps: true})

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

//password checking
userSchema.methods.isPasswordCorrect = async function (passwrod) {
   return await bcrypt.compare(passwrod, this.password)
}

//generating access token
userSchema.methods.generateAccessToken = function() {
     return jwt.sign(
        { //payload h ye
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }

    )
}

//generating refresh token
userSchema.methods.generateRefreshToken = async function() {
    return jwt.sign(
        { //payload h ye
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SCERET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }

    )
}

export const User = mongoose.model("User", userSchema)