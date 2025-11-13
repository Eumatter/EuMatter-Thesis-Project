import express from 'express'
import userAuth from '../middleware/userAuth.js'
import { subscribe, unsubscribe, mySubscriptions } from '../controllers/subscriptionController.js'

const router = express.Router()

router.get('/', userAuth, mySubscriptions)
router.post('/subscribe', userAuth, subscribe)
router.post('/unsubscribe', userAuth, unsubscribe)

export default router


