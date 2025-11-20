# Sample Events Script

This script adds 3 sample featured events to the database with:
- Open for donations and volunteers
- Online images from Unsplash
- Dates from November 21-25, 2024
- Approved status (visible to users)

## Events Created

1. **Community Health Outreach Program** (Nov 21, 2024)
   - Location: Barangay Health Center, Lucena City
   - Donation Target: ₱50,000
   - Category: Community Extension

2. **Environmental Cleanup and Tree Planting** (Nov 23, 2024)
   - Location: Quezon Memorial Circle, Lucena City
   - Donation Target: ₱30,000
   - Category: Community Relations

3. **Educational Support for Underprivileged Children** (Nov 24-25, 2024)
   - Location: MSEUF Community Extension Center, Lucena City
   - Donation Target: ₱75,000
   - Category: Community Extension

## How to Run

Make sure you have:
1. MongoDB connection string in your `.env` file (`MONGO_URI` or `MONGODB_URI`)
2. At least one user in the database (CRD Staff, Department/Organization, or System Administrator)

Then run:

```bash
npm run add-sample-events
```

Or directly:

```bash
node scripts/addSampleEvents.js
```

## Notes

- The script will use the first available CRD Staff, Department/Organization, or System Administrator user as the event creator
- If no suitable user is found, it will use any available user
- Images are downloaded from Unsplash and converted to base64
- If an event with the same title and date already exists, it will be skipped
- All events are set to "Approved" status so they appear in the frontend

