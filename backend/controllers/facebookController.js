import { postEventToFacebook, verifyPageAccessToken, getUserPages, getPageAccessToken } from '../utils/facebookService.js';
import eventModel from '../models/eventModel.js';

/**
 * Post event to Facebook
 * POST /api/facebook/post-event
 */
export const postEventToFacebookController = async (req, res) => {
    try {
        const { eventId, pageAccessToken, pageId, autoPost } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (!eventId) {
            return res.status(400).json({ success: false, message: 'Event ID is required' });
        }

        // Get the event from database
        const event = await eventModel.findById(eventId).populate('createdBy', 'name email');
        
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Check if user has permission to post this event
        if (event.createdBy._id.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'You do not have permission to post this event' });
        }

        // Verify page access token if provided
        if (!pageAccessToken || !pageId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Facebook Page Access Token and Page ID are required' 
            });
        }

        // Check if token is App Token (format: APP_ID|APP_SECRET)
        if (pageAccessToken.includes('|')) {
            return res.status(400).json({ 
                success: false, 
                message: 'App Token provided. Please use a Page Access Token instead. App Tokens cannot be used to post events to Facebook Pages. Please get a Page Access Token from the Access Token Tool: https://developers.facebook.com/tools/accesstoken/'
            });
        }

        // Verify the token
        const tokenVerification = await verifyPageAccessToken(pageAccessToken);
        if (!tokenVerification.success || !tokenVerification.isValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid Facebook Page Access Token. Please make sure you\'re using a Page Access Token (not an App Token). Get your Page Access Token from: https://developers.facebook.com/tools/accesstoken/',
                error: tokenVerification.error
            });
        }

        // Prepare event image URL if available
        let imageUrl = null;
        if (event.image) {
            // If image is base64, you might need to upload it to a public URL first
            // For now, we'll skip the image if it's base64
            // In production, you should upload the image to a CDN or use Facebook's photo upload
            if (event.image.startsWith('http')) {
                imageUrl = event.image;
            } else {
                // Base64 image - would need to be uploaded to a public URL
                // For now, skip the image
                console.log('Event has base64 image, skipping image upload to Facebook');
            }
        }

        // Post event to Facebook
        const result = await postEventToFacebook({
            pageAccessToken,
            pageId,
            title: event.title,
            description: event.description,
            startTime: event.startDate,
            endTime: event.endDate,
            location: event.location,
            imageUrl
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.message || 'Failed to post event to Facebook',
                error: result.error
            });
        }

        // Update event with Facebook post information
        event.facebookPostId = result.facebookEventId;
        event.facebookPostedAt = new Date();
        await event.save();

        return res.json({
            success: true,
            message: 'Event posted to Facebook successfully',
            facebookEventId: result.facebookEventId,
            event: event
        });
    } catch (error) {
        console.error('Error in postEventToFacebookController:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Get user's Facebook pages
 * GET /api/facebook/pages
 */
export const getUserFacebookPages = async (req, res) => {
    try {
        const { userAccessToken } = req.query;

        if (!userAccessToken) {
            return res.status(400).json({ 
                success: false, 
                message: 'User Access Token is required' 
            });
        }

        const result = await getUserPages(userAccessToken);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch Facebook pages',
                error: result.error
            });
        }

        return res.json({
            success: true,
            pages: result.pages
        });
    } catch (error) {
        console.error('Error in getUserFacebookPages:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Verify Facebook Page Access Token
 * POST /api/facebook/verify-token
 */
export const verifyFacebookToken = async (req, res) => {
    try {
        const { pageAccessToken } = req.body;

        if (!pageAccessToken) {
            return res.status(400).json({ 
                success: false, 
                message: 'Page Access Token is required' 
            });
        }

        // Check if token is App Token (format: APP_ID|APP_SECRET)
        if (pageAccessToken.includes('|')) {
            return res.status(400).json({ 
                success: false, 
                message: 'App Token detected. Please use a Page Access Token instead. App Tokens cannot be used to post events. Get your Page Access Token from: https://developers.facebook.com/tools/accesstoken/',
                tokenType: 'App Token',
                helpUrl: 'https://developers.facebook.com/tools/accesstoken/'
            });
        }

        const result = await verifyPageAccessToken(pageAccessToken);

        if (!result.success || !result.isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Facebook Page Access Token. Please make sure you\'re using a Page Access Token (not an App Token).',
                error: result.error,
                helpUrl: 'https://developers.facebook.com/tools/accesstoken/'
            });
        }

        return res.json({
            success: true,
            pageId: result.pageId,
            pageName: result.pageName,
            isValid: true,
            tokenType: 'Page Access Token'
        });
    } catch (error) {
        console.error('Error in verifyFacebookToken:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

