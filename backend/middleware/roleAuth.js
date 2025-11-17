// Role-based authorization middleware
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            // IMPORTANT: Use req.user (set by userAuth middleware) to check the LOGGED-IN user's role
            // Do NOT use req.body.userId, as that may be the target user's ID (e.g., when creating wallets for other users)
            const loggedInUser = req.user;
            
            if (!loggedInUser) {
                return res.status(401).json({ 
                    success: false, 
                    message: "Authentication required. Please log in." 
                });
            }

            // Check if logged-in user's role is in allowed roles
            if (!allowedRoles.includes(loggedInUser.role)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${loggedInUser.role}` 
                });
            }

            // req.user is already set by userAuth middleware, no need to set it again
            next();
        } catch (error) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    };
};

export default requireRole;