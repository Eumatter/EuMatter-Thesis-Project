import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js'

const userAuth = async (req, res, next) => {
    const {token} = req.cookies;
    if (!token){
        return res.status(401).json({
            success: false,
            message: "Not Authorized. Please Login"
        })
    }
    try {
        const tokenDecode = jwt.verify(token,process.env.JWT_SECRET)
        if (tokenDecode.id){
            // Ensure req.body exists before setting userId
            if (!req.body) {
                req.body = {};
            }
            req.body.userId = tokenDecode.id

            // Attach minimal user object for downstream use
            const user = await userModel.findById(tokenDecode.id).select('-password')
            if (user) {
                req.user = user
            }
        }else{
            return res.status(401).json({
                success: false,
                message: "Not Authorized. Please Login"
            })
        }
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message
        })
    }
}

export default userAuth;