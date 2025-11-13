import axios from 'axios';

/**
 * Facebook Graph API Service for posting events
 * This service handles posting events to Facebook Pages
 */

// Facebook Graph API base URL
const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

/**
 * Post an event to Facebook Page
 * @param {Object} options - Posting options
 * @param {string} options.pageAccessToken - Facebook Page Access Token
 * @param {string} options.pageId - Facebook Page ID
 * @param {string} options.title - Event title
 * @param {string} options.description - Event description (HTML stripped)
 * @param {string} options.startTime - Event start time (ISO 8601 format)
 * @param {string} options.endTime - Event end time (ISO 8601 format)
 * @param {string} options.location - Event location
 * @param {string} options.imageUrl - Event image URL (optional)
 * @returns {Promise<Object>} Facebook API response
 */
export const postEventToFacebook = async ({
    pageAccessToken,
    pageId,
    title,
    description,
    startTime,
    endTime,
    location,
    imageUrl = null
}) => {
    try {
        // Strip HTML tags from description for Facebook
        const stripHtml = (html) => {
            if (!html) return '';
            return html
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .trim();
        };

        const cleanDescription = stripHtml(description);

        // Prepare the event data for Facebook
        const eventData = {
            name: title,
            description: cleanDescription || title,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            location: location || 'Location TBA',
            // Facebook event privacy: 'OPEN' (public), 'FRIENDS' (friends only), 'SECRET' (private)
            privacy: 'OPEN',
            // Event timezone (optional, defaults to page timezone)
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        // If image URL is provided, add it to the event
        if (imageUrl) {
            // First, upload the photo to the page
            try {
                const photoResponse = await axios.post(
                    `${FACEBOOK_GRAPH_API}/${pageId}/photos`,
                    {
                        url: imageUrl,
                        published: false, // Don't publish as a separate post
                        access_token: pageAccessToken
                    }
                );

                if (photoResponse.data?.id) {
                    // Use the photo ID as the event cover photo
                    eventData.cover_photo = {
                        photo_id: photoResponse.data.id
                    };
                }
            } catch (photoError) {
                console.error('Error uploading photo to Facebook:', photoError.response?.data || photoError.message);
                // Continue without cover photo if upload fails
            }
        }

        // Create the event on Facebook
        const response = await axios.post(
            `${FACEBOOK_GRAPH_API}/${pageId}/events`,
            eventData,
            {
                params: {
                    access_token: pageAccessToken
                }
            }
        );

        return {
            success: true,
            facebookEventId: response.data.id,
            message: 'Event posted to Facebook successfully',
            data: response.data
        };
    } catch (error) {
        console.error('Error posting event to Facebook:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            message: error.response?.data?.error?.message || 'Failed to post event to Facebook'
        };
    }
};

/**
 * Get Facebook Page Access Token
 * This requires the user to have granted the app permission to manage their pages
 * @param {string} userAccessToken - User's access token
 * @param {string} pageId - Facebook Page ID
 * @returns {Promise<Object>} Page access token
 */
export const getPageAccessToken = async (userAccessToken, pageId) => {
    try {
        // First, get user's pages
        const pagesResponse = await axios.get(
            `${FACEBOOK_GRAPH_API}/me/accounts`,
            {
                params: {
                    access_token: userAccessToken
                }
            }
        );

        // Find the specific page
        const page = pagesResponse.data.data.find(p => p.id === pageId);
        
        if (!page) {
            return {
                success: false,
                error: 'Page not found or user does not have access'
            };
        }

        return {
            success: true,
            pageAccessToken: page.access_token,
            pageName: page.name
        };
    } catch (error) {
        console.error('Error getting page access token:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error || error.message
        };
    }
};

/**
 * Verify Facebook Page Access Token
 * @param {string} pageAccessToken - Page access token to verify
 * @returns {Promise<Object>} Token verification result
 */
export const verifyPageAccessToken = async (pageAccessToken) => {
    try {
        const response = await axios.get(
            `${FACEBOOK_GRAPH_API}/me`,
            {
                params: {
                    access_token: pageAccessToken,
                    fields: 'id,name,access_token'
                }
            }
        );

        return {
            success: true,
            pageId: response.data.id,
            pageName: response.data.name,
            isValid: true
        };
    } catch (error) {
        return {
            success: false,
            isValid: false,
            error: error.response?.data?.error || error.message
        };
    }
};

/**
 * Get user's Facebook pages
 * @param {string} userAccessToken - User's access token
 * @returns {Promise<Object>} User's pages
 */
export const getUserPages = async (userAccessToken) => {
    try {
        const response = await axios.get(
            `${FACEBOOK_GRAPH_API}/me/accounts`,
            {
                params: {
                    access_token: userAccessToken,
                    fields: 'id,name,access_token,category,picture'
                }
            }
        );

        return {
            success: true,
            pages: response.data.data || []
        };
    } catch (error) {
        console.error('Error getting user pages:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            pages: []
        };
    }
};

