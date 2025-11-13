import express from 'express';
import Event from '../models/eventModel.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// Add a comment to an event
router.post('/:eventId/comments', userAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const { text } = req.body;
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const comment = {
            user: req.user._id,
            text: text.trim(),
            createdAt: new Date()
        };

        event.comments.push(comment);
        await event.save();

        // Populate user details in the response
        await event.populate('comments.user', 'name email profileImage');
        const newComment = event.comments[event.comments.length - 1];

        res.status(201).json(newComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all comments for an event
router.get('/:eventId/comments', async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId)
            .select('comments')
            .populate('comments.user', 'name email profileImage');

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json(event.comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update a comment
router.put('/:eventId/comments/:commentId', userAuth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const event = await Event.findOne({
            _id: req.params.eventId,
            'comments._id': req.params.commentId,
            'comments.user': req.user._id // Ensure the comment belongs to the user
        });

        if (!event) {
            return res.status(404).json({ message: 'Comment not found or unauthorized' });
        }

        const comment = event.comments.id(req.params.commentId);
        comment.text = text.trim();
        comment.updatedAt = new Date();
        await event.save();

        await event.populate('comments.user', 'name email profileImage');
        const updatedComment = event.comments.id(req.params.commentId);

        res.json(updatedComment);
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete a comment
router.delete('/:eventId/comments/:commentId', userAuth, async (req, res) => {
    try {
        const event = await Event.findOne({
            _id: req.params.eventId,
            'comments._id': req.params.commentId,
            'comments.user': req.user._id // Ensure the comment belongs to the user
        });

        if (!event) {
            return res.status(404).json({ message: 'Comment not found or unauthorized' });
        }

        event.comments = event.comments.filter(
            comment => comment._id.toString() !== req.params.commentId
        );

        await event.save();
        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
