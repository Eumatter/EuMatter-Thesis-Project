import express from "express";
import {
    getEventVolunteers,
    updateVolunteerStatus,
    removeVolunteer,
    inviteVolunteer,
    acceptInvitation,
    generateAttendanceQR,
    getQRStatus,
    closeEvaluationQR,
    recordAttendance,
    getVolunteerAttendance,
    validateAttendance
} from "../controllers/volunteerController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// Volunteer management routes (for event organizers)
router.get("/event/:eventId", userAuth, getEventVolunteers);
router.put("/event/:eventId/volunteer/:volunteerId/status", userAuth, updateVolunteerStatus);
router.delete("/event/:eventId/volunteer/:volunteerId", userAuth, removeVolunteer);
router.post("/event/:eventId/invite", userAuth, inviteVolunteer);
router.post("/event/:eventId/accept-invitation", userAuth, acceptInvitation);

// QR Code and attendance routes
router.post("/event/:eventId/qr/generate", userAuth, generateAttendanceQR);
router.get("/event/:eventId/qr/status", userAuth, getQRStatus);
router.post("/event/:eventId/qr/close-evaluation", userAuth, closeEvaluationQR);
router.post("/attendance/record", userAuth, recordAttendance);
router.get("/event/:eventId/attendance", userAuth, getVolunteerAttendance);
router.post("/event/:eventId/attendance/validate", userAuth, validateAttendance);

export default router;

