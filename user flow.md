# EuMatter User Flows Documentation

This document contains comprehensive user flows and sample data for all user roles in the EuMatter platform.

---

## Table of Contents
1. [User (Regular User)](#1-user-regular-user)
2. [System Administrator](#2-system-administrator)
3. [CRD Staff](#3-crd-staff)
4. [Department/Organization](#4-departmentorganization)
5. [Auditor](#5-auditor)

---

## 1. User (Regular User)

### Sample User Data
```json
{
  "name": "Juan Dela Cruz",
  "email": "juan.delacruz@mseuf.edu.ph",
  "password": "SecurePass123!",
  "role": "User",
  "userType": "MSEUF",
  "mseufCategory": "Student",
  "studentYear": "3rd Year",
  "department": "College of Engineering",
  "course": "Computer Engineering",
  "mseufId": "A22-34197",
  "birthday": "2003-05-15",
  "gender": "Male",
  "address": "123 Main Street, Lucena City, Quezon",
  "contact": "09123456789",
  "profileImage": ""
}
```

### User Flow 1: Registration and Email Verification

**Step 1: Registration**
- Navigate to `/register`
- Fill registration form:
  - Name: `Juan Dela Cruz`
  - Email: `juan.delacruz@mseuf.edu.ph`
  - Password: `SecurePass123!`
  - Confirm Password: `SecurePass123!`
  - User Type: `MSEUF`
  - Category: `Student`
  - Year: `3rd Year`
  - Department: `College of Engineering`
  - Course: `Computer Engineering`
  - Birthday: `2003-05-15`
  - Gender: `Male`
  - Address: `123 Main Street, Lucena City, Quezon`
  - Contact: `09123456789`
- Accept Terms and Conditions
- Click "Register"

**Step 2: Email Verification**
- Check email inbox for OTP
- Navigate to `/verify-email`
- Enter OTP: `123456` (sample)
- Click "Verify Email"
- Success: Redirected to login page

**Sample OTP Data:**
```json
{
  "email": "juan.delacruz@mseuf.edu.ph",
  "otp": "123456",
  "expiresAt": "2024-01-15T10:30:00Z"
}
```

---

### User Flow 2: Login and Dashboard Access

**Step 1: Login**
- Navigate to `/login`
- Enter credentials:
  - Email: `juan.delacruz@mseuf.edu.ph`
  - Password: `SecurePass123!`
- Click "Login"
- Success: Redirected to `/user/dashboard`

**Step 2: View Dashboard**
- View upcoming events feed
- See volunteer hours summary
- Check pending feedback forms
- Access quick actions:
  - Donate
  - Browse Events
  - Volunteer Hours

**Sample Dashboard Data:**
```json
{
  "upcomingEvents": [
    {
      "id": "evt_001",
      "title": "Community Clean-up Drive",
      "date": "2024-02-15",
      "time": "08:00 AM",
      "location": "Lucena City Plaza",
      "status": "registered"
    }
  ],
  "volunteerHours": {
    "totalHours": 45.5,
    "totalEvents": 8,
    "events": [
      {
        "eventId": "evt_001",
        "eventName": "Community Clean-up Drive",
        "hours": 4.0,
        "date": "2024-01-10"
      }
    ]
  },
  "pendingFeedback": [
    {
      "eventId": "evt_002",
      "eventName": "Blood Donation Drive",
      "dueDate": "2024-01-20"
    }
  ]
}
```

---

### User Flow 3: Browse and Register for Events

**Step 1: Browse Events**
- Navigate to `/user/events`
- View available events list
- Filter by:
  - Category: `Community Service`
  - Date Range: `January 2024 - March 2024`
  - Status: `Open for Registration`

**Step 2: View Event Details**
- Click on event: "Community Clean-up Drive"
- View details:
  - Description: `Join us for a community clean-up drive at Lucena City Plaza`
  - Date: `2024-02-15`
  - Time: `08:00 AM - 12:00 PM`
  - Location: `Lucena City Plaza`
  - Required Volunteers: `50`
  - Registered: `32`
  - Organizer: `College of Engineering`
- View reactions and comments

**Step 3: Register for Event**
- Click "Register as Volunteer"
- Confirm registration
- Success: Notification received, event added to dashboard

**Sample Event Data:**
```json
{
  "id": "evt_001",
  "title": "Community Clean-up Drive",
  "description": "Join us for a community clean-up drive at Lucena City Plaza. We need volunteers to help clean the area and promote environmental awareness.",
  "category": "Community Service",
  "date": "2024-02-15",
  "startTime": "08:00 AM",
  "endTime": "12:00 PM",
  "location": "Lucena City Plaza, Lucena City",
  "requiredVolunteers": 50,
  "registeredVolunteers": 32,
  "organizer": {
    "id": "dept_001",
    "name": "College of Engineering"
  },
  "status": "Open for Registration",
  "image": "https://example.com/event-image.jpg"
}
```

---

### User Flow 4: Make a Donation

**Step 1: Initiate Donation**
- Navigate to `/donate` or click "Donate" from dashboard
- Select event: "Community Clean-up Drive"
- Enter donation amount: `500.00`
- Select payment method: `GCash`
- Add optional message: `Happy to support this cause!`

**Step 2: Payment Processing**
- Review donation details
- Click "Proceed to Payment"
- Redirected to payment gateway
- Complete payment via GCash
- Success: Redirected to `/donation/success`

**Sample Donation Data:**
```json
{
  "eventId": "evt_001",
  "amount": 500.00,
  "paymentMethod": "GCash",
  "donorName": "Juan Dela Cruz",
  "donorEmail": "juan.delacruz@mseuf.edu.ph",
  "message": "Happy to support this cause!",
  "transactionId": "txn_123456789",
  "status": "completed",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

---

### User Flow 5: Submit In-Kind Donation

**Step 1: Submit In-Kind Donation**
- Navigate to event details page
- Click "Submit In-Kind Donation"
- Fill form:
  - Item Name: `50 Bottles of Water`
  - Quantity: `50`
  - Description: `Bottled water for volunteers`
  - Estimated Value: `750.00`
  - Delivery Date: `2024-02-14`
  - Contact: `09123456789`

**Step 2: Submit**
- Click "Submit"
- Success: Notification sent to event organizer

**Sample In-Kind Donation Data:**
```json
{
  "eventId": "evt_001",
  "itemName": "50 Bottles of Water",
  "quantity": 50,
  "description": "Bottled water for volunteers during the event",
  "estimatedValue": 750.00,
  "deliveryDate": "2024-02-14",
  "donorName": "Juan Dela Cruz",
  "donorEmail": "juan.delacruz@mseuf.edu.ph",
  "donorContact": "09123456789",
  "status": "pending",
  "submittedAt": "2024-01-15T15:00:00Z"
}
```

---

### User Flow 6: View Volunteer History

**Step 1: Access Volunteer History**
- Navigate to `/user/volunteer-history`
- View list of past volunteer activities
- See total hours accumulated
- Filter by date range or event

**Step 2: View Details**
- Click on event to view:
  - Event name
  - Date participated
  - Hours credited
  - Attendance status
  - Certificate (if available)

**Sample Volunteer History Data:**
```json
{
  "totalHours": 45.5,
  "totalEvents": 8,
  "events": [
    {
      "eventId": "evt_001",
      "eventName": "Community Clean-up Drive",
      "date": "2024-01-10",
      "hours": 4.0,
      "status": "completed",
      "certificateUrl": "https://example.com/certificate.pdf"
    },
    {
      "eventId": "evt_002",
      "eventName": "Blood Donation Drive",
      "date": "2024-01-05",
      "hours": 2.0,
      "status": "completed",
      "certificateUrl": null
    }
  ]
}
```

---

### User Flow 7: Submit Event Feedback

**Step 1: Access Feedback Form**
- Navigate to dashboard
- Click on pending feedback notification
- Or navigate to event details after completion

**Step 2: Fill Feedback Form**
- Rate event: `5 stars`
- Comments: `Great event! Well organized and meaningful.`
- Suggestions: `Maybe provide more water stations next time.`
- Submit feedback

**Sample Feedback Data:**
```json
{
  "eventId": "evt_001",
  "userId": "user_001",
  "rating": 5,
  "comments": "Great event! Well organized and meaningful.",
  "suggestions": "Maybe provide more water stations next time.",
  "submittedAt": "2024-01-16T10:00:00Z"
}
```

---

### User Flow 8: Update Profile

**Step 1: Access Profile**
- Navigate to `/user/profile`
- View current profile information

**Step 2: Edit Profile**
- Update fields:
  - Contact: `09123456789` → `09187654321`
  - Address: `123 Main Street` → `456 New Avenue, Lucena City`
  - Profile Image: Upload new photo
- Click "Save Changes"

**Sample Updated Profile Data:**
```json
{
  "name": "Juan Dela Cruz",
  "email": "juan.delacruz@mseuf.edu.ph",
  "contact": "09187654321",
  "address": "456 New Avenue, Lucena City, Quezon",
  "profileImage": "https://example.com/profile/juan.jpg",
  "updatedAt": "2024-01-15T16:00:00Z"
}
```

---

## 2. System Administrator

### Sample User Data
```json
{
  "name": "Admin User",
  "email": "admin@mseuf.edu.ph",
  "password": "AdminSecure123!",
  "role": "System Administrator",
  "userType": "MSEUF",
  "mseufCategory": "Staff",
  "department": "IT Department",
  "contact": "09101111111",
  "profileImage": ""
}
```

### User Flow 1: Login and Access Dashboard

**Step 1: Login**
- Navigate to `/login`
- Enter credentials:
  - Email: `admin@mseuf.edu.ph`
  - Password: `AdminSecure123!`
- Click "Login"
- Success: Redirected to `/system-admin/dashboard`

**Step 2: View Dashboard**
- View system statistics:
  - Total Users: `1,250`
  - Total Events: `45`
  - Pending Events: `3`
  - Total Departments: `12`
- View recent user registrations
- Access quick actions

**Sample Dashboard Data:**
```json
{
  "stats": {
    "totalUsers": 1250,
    "totalEvents": 45,
    "pendingEvents": 3,
    "totalDepartments": 12
  },
  "recentUsers": [
    {
      "id": "user_001",
      "name": "Juan Dela Cruz",
      "email": "juan.delacruz@mseuf.edu.ph",
      "role": "User",
      "registeredAt": "2024-01-15T08:00:00Z"
    }
  ]
}
```

---

### User Flow 2: User Management

**Step 1: Access User Management**
- Navigate to `/system-admin/users`
- View list of all users
- Filter by role, status, or search by name/email

**Step 2: Create New User**
- Click "Add User"
- Fill form:
  - Name: `Maria Santos`
  - Email: `maria.santos@mseuf.edu.ph`
  - Password: `TempPass123!`
  - Role: `CRD Staff`
  - User Type: `MSEUF`
  - Category: `Staff`
  - Department: `Community Relations Department`
- Click "Create User"
- Success: User created and notification sent

**Step 3: Edit User**
- Click on user: "Juan Dela Cruz"
- Update role: `User` → `Department/Organization`
- Update department: `College of Engineering`
- Click "Save Changes"

**Step 4: Deactivate User**
- Click on user
- Click "Deactivate"
- Confirm deactivation
- Success: User account deactivated

**Sample User Management Data:**
```json
{
  "users": [
    {
      "id": "user_001",
      "name": "Juan Dela Cruz",
      "email": "juan.delacruz@mseuf.edu.ph",
      "role": "User",
      "status": "active",
      "registeredAt": "2024-01-15T08:00:00Z",
      "lastLogin": "2024-01-16T10:00:00Z"
    },
    {
      "id": "user_002",
      "name": "Maria Santos",
      "email": "maria.santos@mseuf.edu.ph",
      "role": "CRD Staff",
      "status": "active",
      "registeredAt": "2024-01-16T09:00:00Z",
      "lastLogin": null
    }
  ]
}
```

---

### User Flow 3: Wallet Management

**Step 1: Access Wallet Management**
- Navigate to `/system-admin/wallets`
- View all department wallets
- See wallet balances and transaction history

**Step 2: Create Wallet for Department**
- Click "Create Wallet"
- Select department: `College of Engineering`
- Set initial balance: `0.00`
- Click "Create"
- Success: Wallet created

**Step 3: View Wallet Transactions**
- Click on department wallet
- View transaction history:
  - Donations received
  - Funds transferred
  - Expenses (if applicable)

**Sample Wallet Data:**
```json
{
  "walletId": "wallet_001",
  "departmentId": "dept_001",
  "departmentName": "College of Engineering",
  "balance": 15000.00,
  "transactions": [
    {
      "id": "txn_001",
      "type": "donation",
      "amount": 500.00,
      "description": "Donation for Community Clean-up Drive",
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ]
}
```

---

### User Flow 4: System Settings Management

**Step 1: Access System Settings**
- Navigate to `/system-admin/settings`
- View current system configuration

**Step 2: Update Settings**
- Maintenance Mode: `Disabled` → `Enabled`
- Maintenance Message: `System is under maintenance. Please check back later.`
- Facebook Integration: Enable/Disable
- Email Settings: Update SMTP configuration
- Click "Save Settings"

**Sample System Settings Data:**
```json
{
  "maintenanceMode": false,
  "maintenanceMessage": "System is under maintenance. Please check back later.",
  "facebookIntegration": {
    "enabled": true,
    "pageId": "123456789",
    "accessToken": "encrypted_token"
  },
  "emailSettings": {
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "fromEmail": "noreply@mseuf.edu.ph"
  }
}
```

---

### User Flow 5: View System Reports and Audit Logs

**Step 1: Access System Reports**
- Navigate to `/system-admin/reports`
- View audit logs
- Filter by:
  - Category: `User Management`
  - Priority: `High`
  - Date Range: `Last 30 days`

**Step 2: Export Report**
- Select date range: `2024-01-01` to `2024-01-31`
- Click "Export PDF"
- Download generated report

**Sample Audit Log Data:**
```json
{
  "logs": [
    {
      "id": "log_001",
      "userId": "admin_001",
      "userName": "Admin User",
      "action": "User Created",
      "category": "User Management",
      "priority": "High",
      "details": {
        "targetUserId": "user_002",
        "targetUserName": "Maria Santos",
        "role": "CRD Staff"
      },
      "timestamp": "2024-01-16T09:00:00Z",
      "ipAddress": "192.168.1.100"
    }
  ]
}
```

---

## 3. CRD Staff

### Sample User Data
```json
{
  "name": "Maria Santos",
  "email": "maria.santos@mseuf.edu.ph",
  "password": "CRDStaff123!",
  "role": "CRD Staff",
  "userType": "MSEUF",
  "mseufCategory": "Staff",
  "department": "Community Relations Department",
  "contact": "09102222222",
  "profileImage": ""
}
```

### User Flow 1: Login and Access Dashboard

**Step 1: Login**
- Navigate to `/login`
- Enter credentials:
  - Email: `maria.santos@mseuf.edu.ph`
  - Password: `CRDStaff123!`
- Click "Login"
- Success: Redirected to `/crd-staff/dashboard`

**Step 2: View Dashboard**
- View pending events for approval: `3`
- View total donations: `₱125,000.00`
- View active events: `12`
- View department leaderboard summary

**Sample Dashboard Data:**
```json
{
  "pendingEvents": 3,
  "totalDonations": 125000.00,
  "activeEvents": 12,
  "totalVolunteers": 450,
  "recentActivities": [
    {
      "type": "event_approved",
      "eventName": "Community Clean-up Drive",
      "department": "College of Engineering",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### User Flow 2: Review and Approve Events

**Step 1: Access Event Management**
- Navigate to `/crd-staff/events`
- View list of pending events
- Filter by status: `Pending Approval`

**Step 2: Review Event**
- Click on event: "Community Clean-up Drive"
- Review details:
  - Title: `Community Clean-up Drive`
  - Organizer: `College of Engineering`
  - Date: `2024-02-15`
  - Location: `Lucena City Plaza`
  - Expected Volunteers: `50`
  - Budget: `₱10,000.00`
  - Description: `Join us for a community clean-up drive...`
- Review attached documents (if any)

**Step 3: Approve Event**
- Click "Approve"
- Add approval notes: `Event approved. All requirements met.`
- Click "Confirm Approval"
- Success: Event approved, notifications sent to organizer

**Sample Event Approval Data:**
```json
{
  "eventId": "evt_001",
  "title": "Community Clean-up Drive",
  "organizer": {
    "id": "dept_001",
    "name": "College of Engineering"
  },
  "status": "pending",
  "reviewedBy": "maria.santos@mseuf.edu.ph",
  "approvalNotes": "Event approved. All requirements met.",
  "approvedAt": "2024-01-15T11:00:00Z"
}
```

---

### User Flow 3: View and Manage Donations

**Step 1: Access Donations**
- Navigate to `/crd-staff/donations`
- View all donations
- Filter by:
  - Event: `Community Clean-up Drive`
  - Date Range: `January 2024`
  - Status: `Completed`

**Step 2: View Donation Details**
- Click on donation
- View:
  - Donor: `Juan Dela Cruz`
  - Amount: `₱500.00`
  - Payment Method: `GCash`
  - Transaction ID: `txn_123456789`
  - Status: `Completed`
  - Timestamp: `2024-01-15T14:30:00Z`

**Step 3: Export Donations Report**
- Select date range: `2024-01-01` to `2024-01-31`
- Click "Export Report"
- Download CSV/PDF

**Sample Donation Data:**
```json
{
  "donations": [
    {
      "id": "don_001",
      "eventId": "evt_001",
      "eventName": "Community Clean-up Drive",
      "donorName": "Juan Dela Cruz",
      "donorEmail": "juan.delacruz@mseuf.edu.ph",
      "amount": 500.00,
      "paymentMethod": "GCash",
      "transactionId": "txn_123456789",
      "status": "completed",
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ],
  "totalAmount": 125000.00,
  "totalCount": 250
}
```

---

### User Flow 4: Manage In-Kind Donations

**Step 1: Access In-Kind Donations**
- Navigate to `/crd-staff/in-kind-donations`
- View all in-kind donations
- Filter by status: `Pending`

**Step 2: Review In-Kind Donation**
- Click on donation
- View:
  - Item: `50 Bottles of Water`
  - Donor: `Juan Dela Cruz`
  - Estimated Value: `₱750.00`
  - Delivery Date: `2024-02-14`
  - Status: `Pending`

**Step 3: Update Status**
- Change status: `Pending` → `Received`
- Add notes: `Items received and verified.`
- Click "Update Status"
- Success: Status updated, notification sent to donor

**Sample In-Kind Donation Data:**
```json
{
  "id": "inkind_001",
  "eventId": "evt_001",
  "eventName": "Community Clean-up Drive",
  "itemName": "50 Bottles of Water",
  "quantity": 50,
  "estimatedValue": 750.00,
  "donorName": "Juan Dela Cruz",
  "donorEmail": "juan.delacruz@mseuf.edu.ph",
  "deliveryDate": "2024-02-14",
  "status": "pending",
  "notes": "Items received and verified.",
  "updatedAt": "2024-01-16T10:00:00Z"
}
```

---

### User Flow 5: View Department Leaderboard

**Step 1: Access Leaderboard**
- Navigate to `/crd-staff/leaderboard`
- View department rankings
- Filter by:
  - Metric: `Total Donations`
  - Period: `This Month`

**Step 2: View Department Details**
- Click on department: `College of Engineering`
- View:
  - Total Donations: `₱25,000.00`
  - Total Events: `5`
  - Total Volunteers: `120`
  - Ranking: `#1`

**Sample Leaderboard Data:**
```json
{
  "period": "January 2024",
  "metric": "Total Donations",
  "departments": [
    {
      "id": "dept_001",
      "name": "College of Engineering",
      "totalDonations": 25000.00,
      "totalEvents": 5,
      "totalVolunteers": 120,
      "ranking": 1
    },
    {
      "id": "dept_002",
      "name": "College of Business Administration",
      "totalDonations": 20000.00,
      "totalEvents": 4,
      "totalVolunteers": 100,
      "ranking": 2
    }
  ]
}
```

---

### User Flow 6: Generate Reports

**Step 1: Access Reports**
- Navigate to `/crd-staff/reports`
- Select report type: `Event Report`
- Set parameters:
  - Date Range: `2024-01-01` to `2024-01-31`
  - Event Status: `All`
  - Department: `All Departments`

**Step 2: Generate Report**
- Click "Generate Report"
- View report with:
  - Total events: `12`
  - Approved events: `10`
  - Pending events: `2`
  - Total donations: `₱125,000.00`
  - Total volunteers: `450`

**Step 3: Export Report**
- Click "Export PDF"
- Download generated report

**Sample Report Data:**
```json
{
  "reportType": "Event Report",
  "period": "January 2024",
  "summary": {
    "totalEvents": 12,
    "approvedEvents": 10,
    "pendingEvents": 2,
    "totalDonations": 125000.00,
    "totalVolunteers": 450,
    "totalInKindDonations": 15
  },
  "events": [
    {
      "id": "evt_001",
      "title": "Community Clean-up Drive",
      "status": "approved",
      "donations": 25000.00,
      "volunteers": 50
    }
  ]
}
```

---

## 4. Department/Organization

### Sample User Data
```json
{
  "name": "College of Engineering",
  "email": "engineering@mseuf.edu.ph",
  "password": "DeptPass123!",
  "role": "Department/Organization",
  "userType": "MSEUF",
  "mseufCategory": "Department",
  "department": "College of Engineering",
  "contact": "09103333333",
  "profileImage": ""
}
```

### User Flow 1: Login and Access Dashboard

**Step 1: Login**
- Navigate to `/login`
- Enter credentials:
  - Email: `engineering@mseuf.edu.ph`
  - Password: `DeptPass123!`
- Click "Login"
- Success: Redirected to `/department/dashboard`

**Step 2: View Dashboard**
- View department statistics:
  - Active Events: `3`
  - Total Donations: `₱25,000.00`
  - Total Volunteers: `120`
  - Wallet Balance: `₱15,000.00`
- View upcoming events
- View recent donations

**Sample Dashboard Data:**
```json
{
  "activeEvents": 3,
  "totalDonations": 25000.00,
  "totalVolunteers": 120,
  "walletBalance": 15000.00,
  "upcomingEvents": [
    {
      "id": "evt_001",
      "title": "Community Clean-up Drive",
      "date": "2024-02-15",
      "registeredVolunteers": 32,
      "requiredVolunteers": 50
    }
  ],
  "recentDonations": [
    {
      "id": "don_001",
      "donorName": "Juan Dela Cruz",
      "amount": 500.00,
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ]
}
```

---

### User Flow 2: Create and Propose Event

**Step 1: Access Event Management**
- Navigate to `/department/events`
- Click "Create New Event"

**Step 2: Fill Event Form**
- Basic Information:
  - Title: `Community Clean-up Drive`
  - Description: `Join us for a community clean-up drive at Lucena City Plaza. We need volunteers to help clean the area and promote environmental awareness.`
  - Category: `Community Service`
  - Date: `2024-02-15`
  - Start Time: `08:00 AM`
  - End Time: `12:00 PM`
  - Location: `Lucena City Plaza, Lucena City`
- Volunteer Information:
  - Required Volunteers: `50`
  - Minimum Hours: `4`
- Budget Information:
  - Estimated Budget: `₱10,000.00`
  - Budget Breakdown: `Supplies: ₱5,000, Food: ₱3,000, Transportation: ₱2,000`
- Upload event image
- Click "Submit for Approval"

**Step 3: Event Submitted**
- Success: Event submitted, pending CRD Staff approval
- Notification sent to CRD Staff

**Sample Event Creation Data:**
```json
{
  "title": "Community Clean-up Drive",
  "description": "Join us for a community clean-up drive at Lucena City Plaza. We need volunteers to help clean the area and promote environmental awareness.",
  "category": "Community Service",
  "date": "2024-02-15",
  "startTime": "08:00 AM",
  "endTime": "12:00 PM",
  "location": "Lucena City Plaza, Lucena City",
  "requiredVolunteers": 50,
  "minimumHours": 4,
  "estimatedBudget": 10000.00,
  "budgetBreakdown": "Supplies: ₱5,000, Food: ₱3,000, Transportation: ₱2,000",
  "organizer": {
    "id": "dept_001",
    "name": "College of Engineering"
  },
  "status": "pending",
  "submittedAt": "2024-01-10T09:00:00Z"
}
```

---

### User Flow 3: Manage Event Volunteers

**Step 1: Access Volunteer Management**
- Navigate to `/department/events`
- Click on event: "Community Clean-up Drive"
- Click "Manage Volunteers"

**Step 2: View Registered Volunteers**
- View list of registered volunteers:
  - Name: `Juan Dela Cruz`
  - Email: `juan.delacruz@mseuf.edu.ph`
  - Status: `Registered`
  - Registration Date: `2024-01-12`

**Step 3: Mark Attendance**
- On event day, navigate to volunteer management
- Use QR Scanner or manual entry
- Scan volunteer QR code or manually mark:
  - Volunteer: `Juan Dela Cruz`
  - Check-in Time: `08:00 AM`
  - Check-out Time: `12:00 PM`
  - Hours Credited: `4.0`
- Click "Save Attendance"

**Sample Volunteer Management Data:**
```json
{
  "eventId": "evt_001",
  "eventName": "Community Clean-up Drive",
  "volunteers": [
    {
      "userId": "user_001",
      "name": "Juan Dela Cruz",
      "email": "juan.delacruz@mseuf.edu.ph",
      "status": "registered",
      "registeredAt": "2024-01-12T10:00:00Z",
      "attendance": {
        "checkedIn": true,
        "checkInTime": "2024-02-15T08:00:00Z",
        "checkOutTime": "2024-02-15T12:00:00Z",
        "hoursCredited": 4.0
      }
    }
  ],
  "totalRegistered": 32,
  "totalAttended": 30
}
```

---

### User Flow 4: View Event Details and Analytics

**Step 1: Access Event Details**
- Navigate to `/department/events/evt_001/details`
- View comprehensive event information:
  - Event status: `Approved`
  - Registration count: `32/50`
  - Donations received: `₱12,500.00`
  - In-kind donations: `3 items`

**Step 2: View Analytics**
- View volunteer registration trends
- View donation breakdown
- View engagement metrics (reactions, comments, shares)

**Sample Event Details Data:**
```json
{
  "id": "evt_001",
  "title": "Community Clean-up Drive",
  "status": "approved",
  "registrationCount": 32,
  "requiredVolunteers": 50,
  "donationsReceived": 12500.00,
  "inKindDonations": 3,
  "volunteerAttendance": {
    "registered": 32,
    "attended": 30,
    "attendanceRate": 93.75
  },
  "engagement": {
    "reactions": 45,
    "comments": 12,
    "shares": 8
  }
}
```

---

### User Flow 5: View Department Donations

**Step 1: Access Donations**
- Navigate to `/department/donations`
- View all donations for department events
- Filter by:
  - Event: `Community Clean-up Drive`
  - Date Range: `January 2024`

**Step 2: View Donation Details**
- Click on donation
- View:
  - Donor information
  - Amount
  - Payment method
  - Transaction details
  - Event associated

**Sample Department Donations Data:**
```json
{
  "donations": [
    {
      "id": "don_001",
      "eventId": "evt_001",
      "eventName": "Community Clean-up Drive",
      "donorName": "Juan Dela Cruz",
      "donorEmail": "juan.delacruz@mseuf.edu.ph",
      "amount": 500.00,
      "paymentMethod": "GCash",
      "transactionId": "txn_123456789",
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ],
  "totalAmount": 25000.00,
  "totalCount": 50
}
```

---

### User Flow 6: View Wallet Status

**Step 1: Access Wallet Status**
- Navigate to `/department/wallet-status`
- View wallet balance: `₱15,000.00`
- View transaction history

**Step 2: View Transactions**
- View all transactions:
  - Donations received
  - Funds transferred
  - Expenses (if applicable)

**Sample Wallet Data:**
```json
{
  "walletId": "wallet_001",
  "departmentId": "dept_001",
  "departmentName": "College of Engineering",
  "balance": 15000.00,
  "transactions": [
    {
      "id": "txn_001",
      "type": "donation",
      "amount": 500.00,
      "description": "Donation for Community Clean-up Drive",
      "timestamp": "2024-01-15T14:30:00Z"
    },
    {
      "id": "txn_002",
      "type": "donation",
      "amount": 1000.00,
      "description": "Donation for Community Clean-up Drive",
      "timestamp": "2024-01-16T10:00:00Z"
    }
  ]
}
```

---

### User Flow 7: Generate Department Reports

**Step 1: Access Reports**
- Navigate to `/department/reports`
- Select report type: `Event Performance Report`
- Set parameters:
  - Date Range: `2024-01-01` to `2024-01-31`
  - Event Status: `All`

**Step 2: Generate Report**
- Click "Generate Report"
- View report with:
  - Total events: `3`
  - Total donations: `₱25,000.00`
  - Total volunteers: `120`
  - Average attendance rate: `92%`

**Step 3: Export Report**
- Click "Export PDF"
- Download generated report

**Sample Department Report Data:**
```json
{
  "reportType": "Event Performance Report",
  "period": "January 2024",
  "department": "College of Engineering",
  "summary": {
    "totalEvents": 3,
    "totalDonations": 25000.00,
    "totalVolunteers": 120,
    "averageAttendanceRate": 92.0
  },
  "events": [
    {
      "id": "evt_001",
      "title": "Community Clean-up Drive",
      "donations": 12500.00,
      "volunteers": 50,
      "attendanceRate": 93.75
    }
  ]
}
```

---

## 5. Auditor

### Sample User Data
```json
{
  "name": "Auditor User",
  "email": "auditor@mseuf.edu.ph",
  "password": "AuditorPass123!",
  "role": "Auditor",
  "userType": "MSEUF",
  "mseufCategory": "Staff",
  "department": "Internal Audit Office",
  "contact": "09104444444",
  "profileImage": ""
}
```

### User Flow 1: Login and Access Dashboard

**Step 1: Login**
- Navigate to `/login`
- Enter credentials:
  - Email: `auditor@mseuf.edu.ph`
  - Password: `AuditorPass123!`
- Click "Login"
- Success: Redirected to `/auditor/dashboard` (or `/system-admin/reports` if auditor dashboard not implemented)

**Step 2: View Dashboard**
- View audit summary:
  - Total Audit Logs: `1,250`
  - Critical Actions: `15`
  - High Priority Actions: `45`
  - Recent Audit Activities

**Sample Dashboard Data:**
```json
{
  "auditSummary": {
    "totalLogs": 1250,
    "criticalActions": 15,
    "highPriorityActions": 45,
    "mediumPriorityActions": 200,
    "lowPriorityActions": 990
  },
  "recentActivities": [
    {
      "id": "log_001",
      "action": "User Created",
      "category": "User Management",
      "priority": "High",
      "timestamp": "2024-01-16T09:00:00Z"
    }
  ]
}
```

---

### User Flow 2: View Audit Logs

**Step 1: Access Audit Logs**
- Navigate to audit logs page (likely `/system-admin/reports` or dedicated auditor route)
- View all audit logs
- Filter by:
  - Category: `User Management`
  - Priority: `High`
  - Date Range: `Last 30 days`
  - User: `Admin User`

**Step 2: View Log Details**
- Click on audit log entry
- View detailed information:
  - Action: `User Created`
  - User: `Admin User (admin@mseuf.edu.ph)`
  - Target: `Maria Santos (maria.santos@mseuf.edu.ph)`
  - Category: `User Management`
  - Priority: `High`
  - Timestamp: `2024-01-16T09:00:00Z`
  - IP Address: `192.168.1.100`
  - Details: Full action details

**Sample Audit Log Data:**
```json
{
  "logs": [
    {
      "id": "log_001",
      "userId": "admin_001",
      "userName": "Admin User",
      "userEmail": "admin@mseuf.edu.ph",
      "action": "User Created",
      "category": "User Management",
      "priority": "High",
      "details": {
        "targetUserId": "user_002",
        "targetUserName": "Maria Santos",
        "targetUserEmail": "maria.santos@mseuf.edu.ph",
        "role": "CRD Staff",
        "changes": {
          "role": "User → CRD Staff"
        }
      },
      "timestamp": "2024-01-16T09:00:00Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    },
    {
      "id": "log_002",
      "userId": "admin_001",
      "userName": "Admin User",
      "userEmail": "admin@mseuf.edu.ph",
      "action": "Wallet Created",
      "category": "Wallet Management",
      "priority": "Medium",
      "details": {
        "walletId": "wallet_001",
        "departmentId": "dept_001",
        "departmentName": "College of Engineering",
        "initialBalance": 0.00
      },
      "timestamp": "2024-01-15T14:00:00Z",
      "ipAddress": "192.168.1.100"
    }
  ]
}
```

---

### User Flow 3: Filter and Search Audit Logs

**Step 1: Apply Filters**
- Category: Select `Donation Transactions`
- Priority: Select `Critical`
- Date Range: `2024-01-01` to `2024-01-31`
- User: Search `admin`
- Click "Apply Filters"

**Step 2: View Filtered Results**
- View filtered audit logs
- Results show only matching entries

**Sample Filtered Results:**
```json
{
  "filters": {
    "category": "Donation Transactions",
    "priority": "Critical",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "user": "admin"
  },
  "results": [
    {
      "id": "log_003",
      "action": "Large Donation Processed",
      "category": "Donation Transactions",
      "priority": "Critical",
      "amount": 50000.00,
      "timestamp": "2024-01-20T15:00:00Z"
    }
  ],
  "totalCount": 1
}
```

---

### User Flow 4: Export Audit Report

**Step 1: Generate Report**
- Select date range: `2024-01-01` to `2024-01-31`
- Select categories: `All Categories`
- Select priorities: `All Priorities`
- Click "Generate Report"

**Step 2: Review Report**
- View generated report summary
- Review key metrics:
  - Total actions: `250`
  - Critical actions: `5`
  - High priority actions: `20`

**Step 3: Export Report**
- Click "Export PDF"
- Download audit report
- Report includes:
  - Summary statistics
  - Detailed log entries
  - Charts and graphs (if applicable)

**Sample Audit Report Data:**
```json
{
  "reportPeriod": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "summary": {
    "totalActions": 250,
    "criticalActions": 5,
    "highPriorityActions": 20,
    "mediumPriorityActions": 50,
    "lowPriorityActions": 175
  },
  "categories": {
    "User Management": 30,
    "Wallet Management": 15,
    "Event Management": 40,
    "Donation Transactions": 60,
    "System Operations": 105
  },
  "topUsers": [
    {
      "userId": "admin_001",
      "userName": "Admin User",
      "actionCount": 45
    }
  ]
}
```

---

### User Flow 5: Investigate Suspicious Activity

**Step 1: Identify Suspicious Activity**
- Review audit logs
- Identify unusual patterns:
  - Multiple failed login attempts
  - Unauthorized access attempts
  - Unusual donation amounts
  - Rapid role changes

**Step 2: Investigate**
- Click on suspicious log entry
- View detailed information
- Check related logs
- Review user activity history

**Step 3: Generate Investigation Report**
- Document findings
- Export investigation report
- Include:
  - Timeline of events
  - Affected users/systems
  - Recommended actions

**Sample Investigation Data:**
```json
{
  "investigationId": "inv_001",
  "initiatedBy": "auditor@mseuf.edu.ph",
  "initiatedAt": "2024-01-16T10:00:00Z",
  "suspiciousActivity": [
    {
      "logId": "log_004",
      "action": "Multiple Failed Login Attempts",
      "userId": "user_003",
      "timestamp": "2024-01-16T09:30:00Z",
      "details": {
        "attempts": 5,
        "ipAddress": "192.168.1.200"
      }
    }
  ],
  "findings": "User account shows multiple failed login attempts from unknown IP address.",
  "recommendations": [
    "Temporarily lock user account",
    "Contact user to verify identity",
    "Review account security settings"
  ]
}
```

---

## Common Flows (All Roles)

### Password Reset Flow

**Step 1: Request Password Reset**
- Navigate to `/reset-password`
- Enter email: `user@mseuf.edu.ph`
- Click "Send Reset Link"
- Success: OTP sent to email

**Step 2: Verify OTP**
- Check email for OTP: `654321`
- Enter OTP in reset password page
- Click "Verify"

**Step 3: Set New Password**
- Enter new password: `NewSecurePass123!`
- Confirm password: `NewSecurePass123!`
- Click "Reset Password"
- Success: Password reset, redirect to login

**Sample Password Reset Data:**
```json
{
  "email": "user@mseuf.edu.ph",
  "otp": "654321",
  "newPassword": "NewSecurePass123!",
  "expiresAt": "2024-01-16T12:00:00Z"
}
```

---

### Notification Management Flow

**Step 1: Access Notification Preferences**
- Navigate to `/user/notification-preferences`
- View current notification settings

**Step 2: Update Preferences**
- Email Notifications: `Enabled`
- Push Notifications: `Enabled`
- In-App Notifications: `Enabled`
- Event Reminders: `Enabled`
- Donation Receipts: `Enabled`
- Click "Save Preferences"

**Sample Notification Preferences:**
```json
{
  "userId": "user_001",
  "emailNotifications": true,
  "pushNotifications": true,
  "inAppNotifications": true,
  "eventReminders": true,
  "donationReceipts": true,
  "eventUpdates": true,
  "volunteerUpdates": true
}
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All monetary values are in Philippine Peso (₱)
- Sample data is for testing and documentation purposes only
- Actual implementation may vary based on system requirements
- All user flows assume proper authentication and authorization
- Error handling and edge cases should be considered in actual implementation

---

## Version History

- **Version 1.0** - Initial documentation with user flows for all roles
- Created: 2024-01-16
- Last Updated: 2024-01-16

