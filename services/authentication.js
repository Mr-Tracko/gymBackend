const JWT = require("jsonwebtoken");
const { use } = require("../routes/user");
const secret = "$uperMan@123";

function createTokenForUser(user){
    const payload = {
        _id : user._id,
        email : user.email,
        profileImageURL : user.profileImageURL,
        role : user.role,
    }
    //The payload in this function is an object that contains specific user details (_id, email, profileImageURL, role). These details will be embedded inside a JWT (JSON Web Token) when it's created.

    //The purpose of the payload is to store information about the user in the token so that when the token is decoded later, these details can be accessed without needing a database query.
    const token = JWT.sign(payload , secret);
    //The payload is encoded and signed using a secret key.
    //The secret ensures that the token cannot be modified without invalidating it
    return token;
}

function validateToken(token){
    const payload = JWT.verify(token , secret);
    return payload;
}

module.exports = {
    createTokenForUser,
    validateToken,
}