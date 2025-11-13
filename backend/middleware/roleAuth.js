// Role-based authorization middleware
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userId = req.body.userId; // Set by userAuth middleware
            
            if (!userId) {
                return res.status(401).json({ 
                    success: false, 
                    message: "Authentication required" 
                });
            }

            // Import userModel dynamically to avoid circular dependencies
            const userModel = (await import('../models/userModel.js')).default;
            const user = await userModel.findById(userId);
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: "User not found" 
                });
            }

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
                });
            }

            // Add user info to request for use in controllers
            req.user = user;
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