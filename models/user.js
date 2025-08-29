const mongoose = require("mongoose");  // ✅ Ensure mongoose is required
const { createHmac, randomBytes } = require("crypto");
const { createTokenForUser } = require("../services/authentication");

// Destructuring Schema and model from mongoose
const { Schema, model } = mongoose;

const userSchema = new Schema({
    fullName: {
        type: String,
        required: true, // Full name is required
    },
    email: {
        type: String,
        required: true,  // Email is required
        unique: true,  // Email must be unique for each user
    },
    salt: {    
        // Using salt, we are going to hash our password using salt and pepper technique
        type: String,
    },
    password: {
        type: String,
        required: true,  // Password is required
    },
    publicImageURL: {
        type: String,
        default: "/images/avatar.png",  // Default avatar if user doesn't upload an image
    },
    role: {
        type: String,
        enum: ["USER", "ADMIN"],  // The role can only have two values: USER or ADMIN
        default: "USER",  // Default role is USER
    },
});

// Middleware to hash the password before saving it to the database
userSchema.pre("save", function (next) {
    const user = this;

    // If the password is not modified, proceed to next middleware
    if (!user.isModified("password")) return next();

    const salt = randomBytes(16).toString("hex");  
    // Salt is a random string used to secure the user's password using the salt and pepper technique.
    // Here, the salt is a 16-byte random string. It helps in protecting the password from hacking.

    const hashedPassword = createHmac("sha256", salt)
    //sha means secure hash algorithm , and 256 means that it will return the 256 bits long integer
        .update(user.password)
        .digest("hex");
    // SHA256 is the hashing algorithm used for password security.

    user.salt = salt;
    user.password = hashedPassword;  // Store the hashed password instead of plain text

    next();  // Move to the next middleware
});

// Static method to verify the password and generate a token for authentication
userSchema.static("matchPasswordAndGenerateToken", async function (email, password) {
    const user = await this.findOne({ email });
    //ye uss particular email ko find krta h
    if (!user) throw new Error("User Not Found");  // If user does not exist, throw an error

    const userProvidedHash = createHmac("sha256", user.salt)
        .update(password)
        .digest("hex");

    if (userProvidedHash !== user.password) {
        throw new Error("Incorrect Password");  // If password doesn't match, throw an error
    }

    const token = createTokenForUser(user);  // Generate a JWT token for the user
    return token;
});

// ✅ Ensure mongoose model is correctly registered
const User = mongoose.models.User || model("User", userSchema);

module.exports = User;  // Exporting User model for use in other parts of the application