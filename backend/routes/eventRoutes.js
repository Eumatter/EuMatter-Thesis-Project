import express from "express";
import upload from "../middleware/upload.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/roleAuth.js";
import {
    createEvent,
    getEvents,
    getUserEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    reviewEvent,
    acceptEventForReview,
    joinEvent,
    donateToEvent,
    crdCreateEvent,
    duplicateEvent,
    updateEventStatus
} from "../controllers/eventController.js";

const router = express.Router();

// CREATE Event (with image + proposal doc upload) - Only for Department/Organization users
router.post(
    "/",
    userAuth,
    requireRole(["Department/Organization"]),
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "proposalDocument", maxCount: 1 }
    ]),
    createEvent
);

// CREATE Event by CRD (direct) - CRD Staff / System Administrator
router.post(
    "/crd-create",
    userAuth,
    requireRole(["CRD Staff", "System Administrator"]),
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "proposalDocument", maxCount: 1 }
    ]),
    crdCreateEvent
);

// GET All Events
router.get("/", getEvents);

// GET Events Created by Authenticated User - Only for Department/Organization users
router.get("/my-events", userAuth, requireRole(["Department/Organization"]), getUserEvents);

// GET Event by ID
router.get("/:id", getEventById);

// UPDATE Event (support image/doc re-upload) - Only for Department/Organization users
router.put(
    "/:id",
    userAuth,
    requireRole(["Department/Organization"]),
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "proposalDocument", maxCount: 1 }
    ]),
    updateEvent
);

// DELETE Event - Only for Department/Organization users
router.delete("/:id", userAuth, requireRole(["Department/Organization"]), deleteEvent);

// DUPLICATE existing Event - CRD Staff / System Administrator
router.post(
    "/:id/duplicate",
    userAuth,
    requireRole(["CRD Staff", "System Administrator"]),
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "proposalDocument", maxCount: 1 }
    ]),
    duplicateEvent
);

// REVIEW Event (Approve/Decline) - Only for CRD Staff and System Administrator
router.patch("/:id/review", userAuth, requireRole(["CRD Staff", "System Administrator"]), reviewEvent);

// ACCEPT Event for reviewing (move to Pending) - Only for CRD Staff and System Administrator
router.patch("/:id/accept", userAuth, requireRole(["CRD Staff", "System Administrator"]), acceptEventForReview);

// Update Event Status (Upcoming/Ongoing/Completed) - CRD Staff / System Administrator
router.patch("/:id/status", userAuth, requireRole(["CRD Staff", "System Administrator"]), updateEventStatus);

// JOIN Event as Volunteer - Authenticated users only
router.post("/:id/join", userAuth, joinEvent);

// DONATE to Event - Authenticated users only
router.post("/:id/donate", userAuth, donateToEvent);

export default router;
