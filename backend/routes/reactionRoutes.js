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
        
        if (!reactionType || !ALLOWED_REACTIONS.includes(reactionType)) {
            return res.status(400).json({ 
                message: 'Invalid reaction type', 
                allowedReactions: ALLOWED_REACTIONS 
            });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Remove user's previous reaction if any
        ALLOWED_REACTIONS.forEach(type => {
            event.reactions[type] = event.reactions[type].filter(
                userId => !userId.equals(req.user._id)
            );
        });

        // Add new reaction
        if (!event.reactions[reactionType].includes(req.user._id)) {
            event.reactions[reactionType].push(req.user._id);
        }

        await event.save();
        
        // Get updated reaction counts
        const reactionCounts = {};
        ALLOWED_REACTIONS.forEach(type => {
            reactionCounts[type] = event.reactions[type].length;
        });
        reactionCounts.total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
        reactionCounts.userReaction = reactionType;

        res.json({
            message: 'Reaction updated successfully',
            reactions: reactionCounts
        });
    } catch (error) {
        console.error('Error updating reaction:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Remove a reaction from an event
router.delete('/:eventId/react', userAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Remove user from all reaction types
        let removed = false;
        ALLOWED_REACTIONS.forEach(type => {
            const initialLength = event.reactions[type].length;
            event.reactions[type] = event.reactions[type].filter(
                userId => !userId.equals(req.user._id)
            );
            if (initialLength !== event.reactions[type].length) {
                removed = true;
            }
        });

        if (!removed) {
            return res.status(400).json({ message: 'No reaction to remove' });
        }

        await event.save();
        
        // Get updated reaction counts
        const reactionCounts = {};
        ALLOWED_REACTIONS.forEach(type => {
            reactionCounts[type] = event.reactions[type].length;
        });
        reactionCounts.total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

        res.json({
            message: 'Reaction removed successfully',
            reactions: reactionCounts
        });
    } catch (error) {
        console.error('Error removing reaction:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get reaction counts for an event
router.get('/:eventId/reactions', async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId)
            .select('reactions');
            
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const reactionCounts = {};
        ALLOWED_REACTIONS.forEach(type => {
            reactionCounts[type] = event.reactions[type].length;
        });
        reactionCounts.total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

        // If user is authenticated (via cookies), include their current reaction
        if (req.cookies && req.cookies.token) {
            try {
                const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
                const userId = decoded.id || decoded.userId;
                if (userId) {
                    ALLOWED_REACTIONS.forEach(type => {
                        if (event.reactions[type].some(id => id.toString() === userId.toString())) {
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
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
