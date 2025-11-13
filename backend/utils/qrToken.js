import jwt from 'jsonwebtoken'

const QR_SECRET = process.env.JWT_QR_SECRET || process.env.JWT_SECRET

export function issueAttendanceToken({ eventId, issuedByUserId, ttlSeconds = 30 }) {
    if (!QR_SECRET) throw new Error('QR secret not configured')
    const nowSec = Math.floor(Date.now() / 1000)
    const jti = `${eventId}.${nowSec}.${Math.random().toString(36).slice(2, 10)}`
    const payload = {
        sub: 'attendance',
        evt: String(eventId),
        issr: String(issuedByUserId || ''),
        jti
    }
    return jwt.sign(payload, QR_SECRET, { expiresIn: ttlSeconds })
}

export function verifyAttendanceToken(token) {
    if (!QR_SECRET) throw new Error('QR secret not configured')
    const decoded = jwt.verify(token, QR_SECRET)
    if (!decoded || decoded.sub !== 'attendance' || !decoded.evt) {
        throw new Error('Invalid attendance token')
    }
    return decoded
}


