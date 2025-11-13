import express from 'express';
import userAuth from '../middleware/userAuth.js';
import requireRole from '../middleware/roleAuth.js';
import {
    postEventToFacebookController,
    getUserFacebookPages,
    verifyFacebookToken
} from '../controllers/facebookController.js';

const router = express.Router();

// Post event to Facebook - Department/Organization users only
router.post('/post-event', userAuth, requireRole(['Department/Organization']), postEventToFacebookController);

// Get user's Facebook pages - Department/Organization users only
router.get('/pages', userAuth, requireRole(['Department/Organization']), getUserFacebookPages);

// Verify Facebook Page Access Token - Department/Organization users only
router.post('/verify-token', userAuth, requireRole(['Department/Organization']), verifyFacebookToken);

export default router;

