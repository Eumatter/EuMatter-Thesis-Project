# 📋 Project Review  
**Title:** EuMatter - Community Event Management System  
**Last Updated:** December 2024
**Review Date:** December 2024

---

## 🏗️ Architecture Overview

### **Backend (Node.js / Express)**
- **Framework:** Express.js v5.1.0 (ES6 Modules)
- **Database:** MongoDB with Mongoose ODM v8.18.1
- **Authentication:** JWT with httpOnly cookies (7-day expiry), secure/sameSite config by env
- **Role System:** 5 defined roles; enforced by modular middleware (`userAuth`, `roleAuth`)
- **Payment Integration:** PayMongo API v1 (GCash, PayMaya, Cards, Bank Transfers, QRPh, Billease)
- **File Uploads:** Multer v2.0.2, document/image handling (stored as base64)
- **Email Services:** Nodemailer for OTP/notifications with connection verification
- **Security:** Express-rate-limit v7.5.1 (multi-tier, OTP-specific)
- **API Structure:** Modular route/controllers for users, donations, events, volunteers, wallets, audit logs, feedback, push notifications, Facebook integration; webhook support
- **Error Handling:** Central error middleware, Multer/file errors, environment-based responses
- **Scheduled Tasks:** Reminder scheduler, maintenance scheduler, feedback scheduler, QR code scheduler
- **Additional Features:** Audit logging system, department wallet management, push notifications, Facebook integration, in-kind donations, volunteer attendance tracking

### **Frontend (React / Vite)**
- **Framework:** React 19.1.1 + Vite v7.1.2
- **Routing:** React Router DOM v7.8.2, with nested/protected routes (no lazy loading)
- **State:** Context API global state; role-aware dashboard redirection
- **Styling:** TailwindCSS v4.1.13
- **UI:** FontAwesome, Framer Motion, modern reusable components
- **Notifications:** Toastify for all interactions, push notification support
- **Forms:** Controlled, with loading state + client-side required validation
- **Component Structure:** Pages for each major role and function; context/provider in `AppContext.jsx`
- **Payment UI:** Modular donation form, payment processing feedback, receipt PDF download
- **Guarding:** Granular protected routes (`ProtectedRoute.jsx`) - auto role redirects; context re-checks
- **Additional Features:** PWA support, maintenance mode, QR code scanning, social interactions (comments, reactions), rich text editor, audit log viewing
- **Dependencies:** DOMPurify installed but not consistently used, React Query (@tanstack/react-query) available

---

## 🔍 Key Strengths

### **🔒 Security & Auth**
- **Role-based route guards**, backend and frontend (enforced per route)
- **Secure JWT cookies** (auto secure/sameSite based on prod/dev)
- **Rate limiting** with strict/lenient tiers (auth, OTP, frequent checks)
- **Field-level validation** & error returns for all sensitive ops
- **CORS allowlist** (dotenv + localhost fallback)

### **🧩 Modularity & Extensibility**
- **Separation of concerns**: each entity (user, event, donation, volunteer) has dedicated controller, model, routes
- **Middleware-driven auth/role logic**
- **Context API for global app state**
- **Component-based frontend, with dashboard/pages by role**

### **⚙️ Error Handling & Observability**
- Central error middleware for all ops
- Different handling for Multer upload errors
- Support for development fallback (e.g., mocked donations if PayMongo keys missing)

### **💳 Payment Processing**
- **PayMongo full integration**: GCash, PayMaya, Card, Bank, QRPh, Billease
- **Fallback dev/test mode**: Mock references if keys missing, no hard crash
- **Webhook endpoint**: Real-time updates to donation status from PayMongo
- **PDF Receipt generation** (PDFKit + download)
- **Frontend payment state feedback** (+ retry/test success modes)

### **🎨 Modern UI/UX**
- Polished dashboards for all roles (User, CRD Staff, System Admin, Department)
- Role-based quick links and action cards
- Loading, error, and redirect feedback for every route
- Clean mobile-first, responsive design

### **🗃️ Data Model & Indexing**
- **Indexed donation references** for quick lookup
- Objects ref-based (event/user links)
- Department, CRD Staff, Admin, Auditor role separation

---

## 📊 Recent Fixes & Improvements
- OTP model/controller alignment; robust verify/reset flows (+ error feedback)
- Central, environment-based cookie setup
- Multer/file upload error routes tested and integrated
- Full CORS allowlist fallback for localhost/dev (including Vercel preview domains)
- Universal express.urlencoded body parsing added
- Env DB connection observability (events, error tracking)
- Auth middleware always populates req.user
- Rate limiting tiers per route - granular config
- Enhanced mailer config/error handling; robust OTP flow with connection verification
- Route guards and redirect logic (frontend: auto role dashboard fallback)
- Resolved critical dependency issues (express-rate-limit, multer)
- Donation/payment integration: dev fallback, card sources, improved error handling, cash donation support
- Database: indexes on `paymongoReferenceId`, `auditLogModel` (multiple compound + text indexes), `departmentWalletModel`, `subscriptionModel`, `pushSubscriptionModel`, `volunteerAttendanceModel`
- UI: Quick Actions & Stats for each dashboard; improved async feedback; loading spinners everywhere
- New features: Audit logging system, department wallet management, push notifications, Facebook integration, maintenance mode scheduler, feedback scheduler, QR code scheduler
- Pagination implemented in: `adminUserController.getUsers()`, `inKindDonationController.getAllInKindDonations()`, `auditLogController.getAuditLogs()`, `notificationController.listMyNotifications()` (with pagination flag)

---

## 🚨 Areas for Improvement

### **Security & DevOps**
- **Env var validation at boot** (partial implementation; risk of runtime errors)
  - Server.js checks and warns for `PAYMONGO_SECRET_KEY`, `BACKEND_URL`, `FRONTEND_URL` (lines 205-213) but only warns, doesn't fail fast
  - No validation for required env vars (MONGO_URI, JWT_SECRET, etc.)
  - Server may start but fail at runtime when accessing missing env vars
  - PayMongo config throws errors but only when used, not at startup
  - Email service verification exists but is non-blocking (setImmediate with timeout)
- **Helmet.js** headers not yet implemented for extra protection
  - Missing security headers (X-Content-Type-Options, X-Frame-Options, CSP, etc.)
  - No protection against XSS, clickjacking, MIME sniffing
  - No HSTS (HTTP Strict Transport Security) headers
- **Input/content sanitization** (integrate validator.js/Joi on all inputs/controllers)
  - Basic field presence checks only (e.g., `if (!email || !password)`)
  - Email validation exists for MSEUF format but no general email regex validation
  - No password strength requirements (only length check in system settings: 6, 8, or 12 chars)
  - No input length limits or sanitization for text fields
  - User input in regex queries (`$regex: search`) could be vulnerable to ReDoS
  - No HTML/content sanitization for user-generated content (comments, descriptions, event descriptions)
  - DOMPurify is installed in frontend but only used in `EventDetails.jsx` (not consistently across all user-generated content)
- **Webhook security**
  - PayMongo webhook endpoint (`/api/donations/webhook`) lacks signature verification
  - TODO comment exists in code (lines 1422-1434 in `donationController.js`) indicating planned implementation
  - Webhook endpoint is public without authentication/verification
  - No rate limiting on webhook endpoint
  - Risk of fake webhook calls modifying donation status
  - PayMongo provides webhook signature headers that should be verified
  - Audit logging exists for webhook events but doesn't prevent unauthorized access
  - Code references `getWebhookSecret(walletUserId)` function that doesn't exist yet
- **API key management/rotation** (manual in .env; automate + audit trail recommended)
- **Mixed authentication middleware**
  - Both `auth.js` (Bearer token from Authorization header) and `userAuth.js` (JWT from httpOnly cookies) exist
  - `userAuth.js` is used consistently across all routes, but `auth.js` exists unused in `middleware/` directory
  - `auth.js` exports `protect` and `admin` functions but is never imported in routes
  - Could lead to confusion and security gaps if accidentally used
  - Consider removing unused `auth.js` or documenting when to use each
- **Password security**
  - Passwords hashed with bcryptjs (good)
  - No password history or complexity requirements beyond length
  - No account lockout after failed login attempts
  - No password expiration policy

### **API & Docs**
- **No OpenAPI/Swagger docs** (difficult for third-party/client onboarding)
- **Request/response schemas** not formally defined
- **No API versioning**

### **Performance & Scaling**
- **Database Indexing**
  - **Existing indexes:**
    - `donationModel`: `paymongoReferenceId`
    - `notificationModel`: `userId` (implicit via schema)
    - `pushSubscriptionModel`: `userId + isActive`, `endpoint`
    - `volunteerAttendanceModel`: `eventId + userId + date`, `event + volunteer + date`, `qrCode`
    - `subscriptionModel`: `userId + scope + targetId` (unique compound)
    - `departmentWalletModel`: `userId`, `isActive`
    - `auditLogModel`: `timestamp + priority`, `category + timestamp`, `userId + timestamp`, `actionType + timestamp`, `success + timestamp`, text index on `actionType + userEmail + resourceType + errorMessage`
  - **Missing indexes on frequently queried fields:**
    - `userModel`: email (unique constraint but no explicit index), role, createdAt, department
    - `eventModel`: createdBy, status, startDate, endDate, createdAt, eventCategory
    - `donationModel`: user, event, status, createdAt, paymentMethod, recipientType, department
    - `volunteerAttendanceModel`: userId (for user history queries - only has compound indexes)
  - **Missing compound indexes for common query patterns:**
    - `eventModel`: `createdBy + status`, `status + createdAt`, `eventCategory + status`
    - `donationModel`: `user + status`, `event + status`, `status + createdAt`, `recipientType + department`
    - `userModel`: `role + department`, `role + createdAt`
- **Query optimization** (large list endpoints, e.g., users, events)
  - `getEvents()` in eventController fetches ALL events without pagination
  - `getUserEvents()` fetches ALL user events without pagination
  - `getMyDonations()` fetches all donations for a user without pagination (filters out pending but no pagination)
  - Multiple populate operations without limit could be slow
  - **Pagination implemented in:**
    - `adminUserController.getUsers()` - full pagination with page, limit, search, role filter
    - `inKindDonationController.getAllInKindDonations()` - full pagination
    - `auditLogController.getAuditLogs()` - full pagination with filtering
    - `notificationController.listMyNotifications()` - pagination with skip/limit (max 100 items), optional paginated flag
  - **Still missing pagination:**
    - `eventController.getEvents()` - fetches all events with multiple populate operations
    - `eventController.getUserEvents()` - fetches all user events with multiple populate operations
    - `donationController.getMyDonations()` - fetches all user donations (filters pending but no pagination)
    - `donationController.getAllDonations()` - fetches all donations for CRD/Admin without pagination
    - Other list endpoints may also lack pagination
- **No connection pooling** (DB, mail, etc) or caching layer for high-traffic
  - MongoDB connection uses default pooling (no explicit config)
  - No Redis or in-memory caching for frequently accessed data
  - No query result caching
  - No connection pool size configuration
- **Pagination partially implemented** (risk: large data, slow loads on some endpoints)
  - Pagination exists for: users (admin), in-kind donations, audit logs, notifications
  - Still missing pagination for: events list, user events, user donations, all donations (CRD/Admin), volunteers list
  - `getEvents()` performs expensive operations: fetches all events, then for each event fetches donations (limited to 100 per event but no overall limit)
  - Risk of memory issues and slow response times as data grows on unpaginated endpoints
  - Frontend may struggle with large datasets from unpaginated endpoints
- **Inefficient data storage**
  - Images stored as base64 strings in database (eventModel.image, proposalDocument)
  - User profile images also stored as base64
  - Increases document size, slows queries, wastes storage
  - Base64 encoding increases size by ~33%
  - Should use file storage (S3, local filesystem) with URL references
  - No image compression or optimization

### **Frontend Performance**
- **No lazy loading** - all routes imported directly in `App.jsx` (confirmed: no `React.lazy()` usage)
  - All 30+ page components loaded on initial bundle
  - Large initial bundle size, slower first load
  - Should use `React.lazy()` and `Suspense` for route-based code splitting
  - No code splitting implemented despite Vite support
  - React Query (@tanstack/react-query) is installed but may not be fully utilized for caching
- **Minimal use of React.memo** - potential unnecessary re-renders
  - `React.memo` only used in `CommentModal.jsx` and `CommentSection.jsx` for `CommentItem` components
  - Some components use `useMemo` and `useCallback` (UserDashboard, DepartmentDashboard, CommentModal)
  - List components (events, donations, users) not memoized
  - Dashboard components re-render on every context update
  - Some expensive computations memoized, but not consistently
  - Most list items and card components not memoized, causing unnecessary re-renders
- **Images not lazy-loaded/optimized** for campaign/event feeds
  - Base64 images in database loaded immediately
  - No image optimization, compression, or responsive images
  - No lazy loading attribute on `<img>` tags
  - No image CDN or optimization service
- **Bundle size can be reduced with code splitting**
  - Vite PWA plugin configured but no route-based splitting
  - All vendor libraries in single bundle
  - Large dependencies (recharts, framer-motion, lottie-react) loaded upfront
- **Duplicate authentication checks**
  - `ProtectedRoute` makes separate API call to `/api/auth/is-authenticated` even when `AppContext` already checked
  - `ProtectedRoute` checks `isLoading` from context but still makes redundant API call
  - Unnecessary network requests and loading states on every protected route access
  - Should rely on context state (`isLoggedIn`, `userData`) instead of re-fetching
  - Both `AppContext` and `ProtectedRoute` check authentication independently, causing double requests
- **No error boundaries**
  - React errors will crash entire app
  - No graceful error handling for component failures
  - No fallback UI for errors

### **QA & Monitoring**
- **No test coverage** (unit/integration/E2E)
  - No test files found in project
  - No test framework configured (Jest, Mocha, etc.)
  - Critical payment, auth, and data operations untested
- **No backend lint config**
  - ESLint configured for frontend only
  - Backend code has no linting rules
  - Inconsistent code style and potential bugs
- **Limited error/health monitoring** (console.log only)
  - All logging via `console.log/error`
  - No structured logging (Winston, Pino, Bunyan)
  - No log levels, rotation, or persistence
  - No error tracking service (Sentry, Rollbar)
  - No health check endpoint (`/health`, `/status`) - confirmed not found
  - No metrics or performance monitoring
  - Audit logging system exists for user actions but not for system health

---

## 📈 Technical Debt

### **Backend**
- **Controllers are still large** (e.g., authController, donationController)
  - `donationController.js`: 1900+ lines, handles multiple payment flows, webhooks, receipts, cash donations
  - `eventController.js`: 900+ lines, multiple responsibilities (CRUD, analytics, volunteers, feedback, QR codes)
  - `authController.js`: 672+ lines, handles registration, login, OTP, password reset
  - Should be split into smaller, focused modules (e.g., paymentService, receiptService, webhookService)
- **Error handling logic is partially repetitive** and could be DRYed out
  - Similar try-catch blocks across controllers
  - Inconsistent error response formats (some use `success: false`, others don't)
  - Some return `{ message }`, others `{ success: false, message }`
  - Should use centralized error handler and custom error classes
- **No centralized Joi/Yup validation** (multiple field checks scattered in controllers)
  - No validation library installed (Joi, Yup, express-validator not found in dependencies)
  - Validation logic duplicated in each controller
  - No schema definitions or reusable validators
  - Should use middleware-based validation
  - Basic validation exists (required fields, enum checks) but not standardized
- **Input sanitization**: only partial, sometimes missing
  - No library for sanitization (validator.js, DOMPurify for HTML)
  - User input directly used in queries and responses
  - DOMPurify available in frontend but not used consistently
  - No sanitization for comments, descriptions, event titles
- **Compound indexes partially implemented**
  - Good compound indexes exist in `auditLogModel` and `volunteerAttendanceModel`
  - Missing compound indexes for common query patterns in `eventModel`, `donationModel`, `userModel`
  - No unique constraints beyond email
  - No partial indexes for filtered queries
- **Inconsistent response formats**
  - Some endpoints return `{ success: true, data }`
  - Others return `{ message, data }` or just `data`
  - Should standardize API response structure
  - Webhook endpoint returns `{ received: true }` which is different
- **No request ID/tracing**
  - Difficult to trace requests across logs
  - No correlation IDs for debugging
  - No request logging middleware
- **Role validation inconsistency**
  - `userController.updateUserRole` uses: ["User", "System Administrator", "CRD Staff", "Department/Organization", "Auditor"]
  - `adminUserController.updateUserRole` uses: ['student', 'faculty', 'department', 'crd', 'organization', 'alumni', 'admin']
  - Two different role systems exist, causing confusion

### **Frontend**
- **Some duplicated component/layout code** (e.g., dashboard sidebars/stats)
  - Similar dashboard layouts across roles
  - Repeated sidebar/navigation code
  - Should extract shared components
- **No error boundaries**
  - No fallback UI for component errors
  - Errors propagate to root and crash app
- **Context re-renders**
  - `AppContext` updates cause all consumers to re-render
  - Should split context or use selectors
- **No API response caching**
  - Same data fetched multiple times
  - No cache invalidation strategy

---

## 💡 Recommendations & Next Steps

### **Critical (Before Production)**
1. **Environment variable validation**
   - Enhance existing warnings in `server.js` to fail fast for critical vars
   - Create `config/envValidator.js` to check all required vars at startup
   - Fail fast with clear error messages for MONGO_URI, JWT_SECRET, etc.
   - Document required vs optional variables

2. **Webhook security**
   - Implement PayMongo webhook signature verification
   - Add authentication/rate limiting to webhook endpoint
   - Validate webhook payload structure

3. **Input validation & sanitization**
   - Install and configure Joi or Yup
   - Create validation middleware for all routes
   - Add email format, password strength, length limits
   - Sanitize user input (especially for regex queries)

4. **Database indexes**
   - Add indexes: `userModel.email` (explicit), `userModel.role`, `userModel.department`, `eventModel.createdBy`, `eventModel.status`, `eventModel.eventCategory`, `donationModel.user`, `donationModel.event`, `donationModel.status`, `volunteerAttendanceModel.userId`
   - Create compound indexes: `eventModel` (createdBy + status, status + createdAt), `donationModel` (user + status, event + status, status + createdAt), `userModel` (role + department)
   - Monitor slow queries and add indexes as needed

5. **Pagination for list endpoints**
   - Implement pagination in `eventController.getEvents()`, `eventController.getUserEvents()`, `donationController.getMyDonations()`, `donationController.getAllDonations()`
   - Add query params: `page`, `limit`, `sort` (follow pattern from `adminUserController.getUsers()`)
   - Return metadata: `total`, `totalPages`, `currentPage`
   - Optimize `getEvents()` to avoid fetching donations for all events (consider separate endpoint or lazy loading)
   - Review other list endpoints for pagination needs

### **High Priority**
6. **Security headers (Helmet.js)**
   - Install and configure Helmet.js
   - Set appropriate CSP, X-Frame-Options, etc.
   - Test in production environment

7. **Image storage optimization**
   - Move from base64 to file storage (local or S3)
   - Store file URLs in database instead of base64
   - Implement image upload endpoint with Multer
   - Add image optimization/compression

8. **Frontend code splitting**
   - Convert all route imports to `React.lazy()`
   - Add `Suspense` boundaries with loading states
   - Implement route-based code splitting

9. **Error handling standardization**
   - Create custom error classes (ValidationError, NotFoundError, etc.)
   - Standardize API response format: `{ success, data, error, message }`
   - Update all controllers to use consistent format

10. **Fix duplicate auth checks**
    - Refactor `ProtectedRoute` to rely on `AppContext` state (`isLoggedIn`, `userData`) instead of making separate API call
    - Remove redundant `/api/auth/is-authenticated` call in `ProtectedRoute`
    - Only make API call if context state is unavailable or stale
    - Add error boundary for auth failures

### **Medium Priority**
11. **Structured logging**
    - Replace `console.log` with Winston or Pino
    - Add log levels, formatting, and file rotation
    - Include request IDs for tracing

12. **Health check endpoint**
    - Create `/api/health` endpoint
    - Check DB connection, external services (PayMongo, SMTP)
    - Return service status for monitoring

13. **API documentation**
    - Generate OpenAPI/Swagger docs
    - Document all endpoints, request/response schemas
    - Add examples and error codes

14. **Backend linting**
    - Add ESLint configuration for backend
    - Set up pre-commit hooks
    - Fix existing linting issues

15. **React performance optimization**
    - Wrap list components in `React.memo`
    - Use `useMemo` for expensive computations
    - Add error boundaries for each route section

16. **Test coverage**
    - Set up Jest for backend unit tests
    - Add integration tests for critical flows (auth, payments)
    - Frontend component testing with React Testing Library

### **Long-term**
17. **Caching layer**
    - Implement Redis for frequently accessed data
    - Cache user sessions, event lists, leaderboards
    - Add cache invalidation strategy

18. **Monitoring & observability**
    - Integrate error tracking (Sentry)
    - Add performance monitoring (APM)
    - Set up alerts for critical errors

19. **API versioning**
    - Implement `/api/v1/` prefix
    - Plan migration strategy for future versions
    - Document versioning policy

20. **CI/CD pipeline**
    - Set up automated testing
    - Configure deployment pipelines
    - Add staging environment

21. **Microservices consideration**
    - Evaluate splitting payment, notification, and event services
    - Plan for horizontal scaling
    - Consider message queue for async operations

---

## 🎯 Overall Assessment

### **Status:**
A well-architected, modular, and modern MERN-stack system with feature-completeness for community event management, donations (with robust payments), and multi-role operations. The codebase demonstrates good separation of concerns, modern React patterns, and comprehensive payment integration. Recent additions include audit logging, wallet management, push notifications, Facebook integration, and various schedulers for automated tasks.

### **Strengths:**
- ✅ Clean modular architecture (routes, controllers, models)
- ✅ Comprehensive payment integration (PayMongo with multiple payment methods)
- ✅ Role-based access control (backend + frontend)
- ✅ Modern React with Context API
- ✅ PWA support configured
- ✅ Rate limiting implemented
- ✅ Secure cookie handling
- ✅ Audit logging system for tracking user actions
- ✅ Department wallet management for multi-wallet support
- ✅ Scheduled tasks (reminders, maintenance, feedback, QR codes)
- ✅ Pagination implemented in several key endpoints
- ✅ Good database indexing in audit logs and some models

### **Critical Issues:**
- ⚠️ **Security**: Missing webhook signature verification (TODO in code), no input sanitization, partial env validation (warnings only)
- ⚠️ **Performance**: Missing pagination on events/donations endpoints, missing DB indexes on core models (user, event, donation), inefficient base64 image storage
- ⚠️ **Reliability**: No error boundaries in frontend, no health check endpoint, no structured logging (console.log only)

### **Deployment Recommendation:**
**NOT READY for production** without addressing critical security and performance issues.

**Minimum requirements before production:**
1. Environment variable validation at startup (fail fast for critical vars)
2. PayMongo webhook signature verification (TODO exists in code)
3. Input validation and sanitization middleware
4. Database indexes on frequently queried fields (user, event, donation models)
5. Pagination for remaining list endpoints (events, user events, user donations)
6. Security headers (Helmet.js)
7. Health check endpoint (`/api/health`)
8. Error boundaries in frontend

**Estimated effort:** 2-3 weeks for critical fixes, 1-2 months for comprehensive improvements.

**Risk Assessment:**
- **High Risk**: Webhook security, input validation, missing indexes (could cause downtime)
- **Medium Risk**: No pagination (performance degradation), no error boundaries (poor UX)
- **Low Risk**: Missing tests, no API docs (maintenance burden)
