import express from 'express';
import jwt from 'jsonwebtoken';
import Event from '../models/eventModel.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// Allowed reaction types
const ALLOWED_REACTIONS = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

// Add or update a reaction to an event
router.post('/:eventId/react', userAuth, async (req, res) => {
    try {
        const { reactionType } = req.body;
        
        // Validate reactionType
        if (!reactionType || typeof reactionType !== 'string') {
            return res.status(400).json({ 
                message: 'Reaction type is required', 
                allowedReactions: ALLOWED_REACTIONS 
            });
        }
        
        if (!ALLOWED_REACTIONS.includes(reactionType)) {
            return res.status(400).json({ 
                message: 'Invalid reaction type', 
                received: reactionType,
                allowedReactions: ALLOWED_REACTIONS 
            });
        }

        // Validate eventId
        const { eventId } = req.params;
        if (!eventId || eventId.length !== 24) {
            return res.status(400).json({ 
                message: 'Invalid event ID format',
                received: eventId
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Initialize reactions object if it doesn't exist
        if (!event.reactions || typeof event.reactions !== 'object') {
            event.reactions = {
                like: [],
                love: [],
                haha: [],
                wow: [],
                sad: [],
                angry: []
            };
        }

        // Initialize each reaction array if it doesn't exist
        ALLOWED_REACTIONS.forEach(type => {
            if (!Array.isArray(event.reactions[type])) {
                event.reactions[type] = [];
            }
        });

        // Remove user's previous reaction if any
        const userObjectId = req.user._id;
        ALLOWED_REACTIONS.forEach(type => {
            event.reactions[type] = event.reactions[type].filter(
                userId => userId && userId.toString() !== userObjectId.toString()
            );
        });

        // Add new reaction (only if not already present - defensive check)
        if (!event.reactions[reactionType].some(id => id.toString() === userObjectId.toString())) {
            event.reactions[reactionType].push(userObjectId);
        }

        await event.save();
        
        // Get updated reaction counts
        const reactionCounts = {};
        ALLOWED_REACTIONS.forEach(type => {
            reactionCounts[type] = Array.isArray(event.reactions[type]) ? event.reactions[type].length : 0;
        });
        reactionCounts.total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
        reactionCounts.userReaction = reactionType;

        res.json({
            message: 'Reaction updated successfully',
            reactions: reactionCounts
        });
    } catch (error) {
        console.error('Error updating reaction:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                message: 'Invalid event ID format',
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Remove a reaction from an event
router.delete('/:eventId/react', userAuth, async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Validate eventId format
        if (!eventId || eventId.length !== 24) {
            return res.status(400).json({ 
                message: 'Invalid event ID format',
                received: eventId
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Initialize reactions object if it doesn't exist
        if (!event.reactions || typeof event.reactions !== 'object') {
            event.reactions = {
                like: [],
                love: [],
                haha: [],
                wow: [],
                sad: [],
                angry: []
            };
        }

        // Initialize each reaction array if it doesn't exist
        ALLOWED_REACTIONS.forEach(type => {
            if (!Array.isArray(event.reactions[type])) {
                event.reactions[type] = [];
            }
        });

        // Remove user from all reaction types
        let removed = false;
        const userObjectId = req.user._id;
        
        ALLOWED_REACTIONS.forEach(type => {
            const initialLength = event.reactions[type].length;
            event.reactions[type] = event.reactions[type].filter(
                userId => userId && userId.toString() !== userObjectId.toString()
            );
            if (initialLength !== event.reactions[type].length) {
                removed = true;
            }
        });

        // If no reaction was removed, return success anyway (idempotent operation)
        // This prevents errors when user clicks remove multiple times
        if (!removed) {
            // Still return success with current counts
            const reactionCounts = {};
            ALLOWED_REACTIONS.forEach(type => {
                reactionCounts[type] = Array.isArray(event.reactions[type]) ? event.reactions[type].length : 0;
            });
            reactionCounts.total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
            
            return res.json({
                message: 'No reaction to remove (already removed)',
                reactions: reactionCounts
            });
        }

        await event.save();
        
        // Get updated reaction counts
        const reactionCounts = {};
        ALLOWED_REACTIONS.forEach(type => {
            reactionCounts[type] = Array.isArray(event.reactions[type]) ? event.reactions[type].length : 0;
        });
        reactionCounts.total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

        res.json({
            message: 'Reaction removed successfully',
            reactions: reactionCounts
        });
    } catch (error) {
        console.error('Error removing reaction:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                message: 'Invalid event ID format',
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Get reaction counts for an event
router.get('/:eventId/reactions', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Validate eventId format
        if (!eventId || eventId.length !== 24) {
            return res.status(400).json({ 
                message: 'Invalid event ID format',
                received: eventId
            });
        }

        const event = await Event.findById(eventId).select('reactions');
            
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Initialize reactions object if it doesn't exist
        if (!event.reactions || typeof event.reactions !== 'object') {
            event.reactions = {
                like: [],
                love: [],
                haha: [],
                wow: [],
                sad: [],
                angry: []
            };
        }

        // Initialize each reaction array if it doesn't exist
        ALLOWED_REACTIONS.forEach(type => {
            if (!Array.isArray(event.reactions[type])) {
                event.reactions[type] = [];
            }
        });

        const reactionCounts = {};
        ALLOWED_REACTIONS.forEach(type => {
            reactionCounts[type] = Array.isArray(event.reactions[type]) ? event.reactions[type].length : 0;
        });
        reactionCounts.total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

        // If user is authenticated (via cookies), include their current reaction
        if (req.cookies && req.cookies.token) {
            try {
                const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
                const userId = decoded.id || decoded.userId;
                if (userId) {
                    ALLOWED_REACTIONS.forEach(type => {
                        if (Array.isArray(event.reactions[type]) && 
                            event.reactions[type].some(id => id && id.toString() === userId.toString())) {
                            reactionCounts.userReaction = type;
                        }
                    });
                }
            } catch (error) {
                // Token is invalid or expired, ignore
            }
        }

        res.json({ reactions: reactionCounts });
    } catch (error) {
        console.error('Error getting reactions:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                message: 'Invalid event ID format',
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

export default router;
