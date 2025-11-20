# Integration Testing Guide

## Overview
This guide provides step-by-step instructions for setting up and running integration tests for the EuMatter project. Integration tests verify that different parts of the system work together correctly, particularly API endpoints.

**Estimated Time:** 1 hour  
**Tools:** Supertest, Jest

---

## Prerequisites

1. Node.js (v18 or higher)
2. npm or yarn package manager
3. MongoDB instance (local or test database)
4. Environment variables configured for testing
5. Backend server dependencies installed

---

## Setup Instructions

### 1. Install Dependencies

Navigate to the backend directory and install Supertest:

```bash
cd EuMatter-Thesis-Project/backend
npm install --save-dev supertest
```

### 2. Create Test Environment Configuration

Create `backend/.env.test`:

```env
NODE_ENV=test
PORT=8001
MONGODB_URI=mongodb://localhost:27017/eumatter_test
JWT_SECRET=test_jwt_secret_key
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

### 3. Create Test Database Setup

Create `backend/__tests__/setup/testDB.js`:

```javascript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export const setupTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
};

export const teardownTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
```

Alternatively, if using a real test database:

```javascript
import mongoose from 'mongoose';
import connectDB from '../../config/mongoDB.js';

export const setupTestDB = async () => {
  await connectDB();
};

export const teardownTestDB = async () => {
  await mongoose.connection.close();
};

export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
```

### 4. Create Test Helper Utilities

Create `backend/__tests__/helpers/testHelpers.js`:

```javascript
import userModel from '../../models/userModel.js';
import bcrypt from 'bcryptjs';

export const createTestUser = async (userData = {}) => {
  const defaultUser = {
    email: 'test@mseuf.edu.ph',
    password: await bcrypt.hash('password123', 10),
    name: 'Test User',
    role: 'User',
    isVerified: true,
    ...userData,
  };

  return await userModel.create(defaultUser);
};

export const getAuthToken = async (app, email = 'test@mseuf.edu.ph', password = 'password123') => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  // Extract token from cookies or response
  return response.headers['set-cookie']?.[0] || response.body.token;
};
```

---

## Testing API Endpoints

### Test 1: POST /api/auth/login

Create `backend/__tests__/integration/auth.test.js`:

```javascript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from '../../routes/authRoutes.js';
import { setupTestDB, teardownTestDB, clearDatabase } from '../setup/testDB.js';
import { createTestUser } from '../helpers/testHelpers.js';

const app = express();

// Setup middleware (matching your server.js setup)
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should login user with valid credentials', async () => {
    // Arrange
    const testUser = await createTestUser({
      email: 'user@mseuf.edu.ph',
      password: 'hashedPassword',
    });

    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@mseuf.edu.ph',
        password: 'password123',
      })
      .expect(200);

    // Assert
    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe('user@mseuf.edu.ph');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should reject login with invalid email', async () => {
    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@mseuf.edu.ph',
        password: 'password123',
      })
      .expect(401);

    // Assert
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Invalid');
  });

  it('should reject login with invalid password', async () => {
    // Arrange
    await createTestUser({
      email: 'user@mseuf.edu.ph',
    });

    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@mseuf.edu.ph',
        password: 'wrongpassword',
      })
      .expect(401);

    // Assert
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Invalid');
  });

  it('should reject login with missing fields', async () => {
    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@mseuf.edu.ph',
        // Missing password
      })
      .expect(400);

    // Assert
    expect(response.body.success).toBe(false);
  });

  it('should enforce rate limiting', async () => {
    // Arrange
    await createTestUser();

    // Act - Make multiple requests rapidly
    const requests = Array(15).fill(null).map(() =>
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@mseuf.edu.ph',
          password: 'wrongpassword',
        })
    );

    const responses = await Promise.all(requests);
    
    // Assert - Last request should be rate limited
    const rateLimitedResponse = responses[responses.length - 1];
    expect(rateLimitedResponse.status).toBe(429);
  });
});
```

### Test 2: POST /api/donations/create

Create `backend/__tests__/integration/donations.test.js`:

```javascript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import donationRouter from '../../routes/donationRoutes.js';
import userAuth from '../../middleware/userAuth.js';
import { setupTestDB, teardownTestDB, clearDatabase } from '../setup/testDB.js';
import { createTestUser } from '../helpers/testHelpers.js';
import jwt from 'jsonwebtoken';

const app = express();

// Setup middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/donations', donationRouter);

// Mock PayMongo client
jest.mock('../../config/paymongo.js', () => ({
  default: {
    post: jest.fn(),
  },
}));

describe('POST /api/donations/create', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    testUser = await createTestUser();
    
    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id, role: testUser.role },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '7d' }
    );
  });

  it('should create donation with valid data', async () => {
    // Arrange
    const paymongoClient = (await import('../../config/paymongo.js')).default;
    paymongoClient.post.mockResolvedValue({
      data: {
        data: {
          id: 'payment_intent_123',
          attributes: {
            client_key: 'client_key_123',
            status: 'awaiting_payment_method',
          },
        },
      },
    });

    // Act
    const response = await request(app)
      .post('/api/donations')
      .set('Cookie', `token=${authToken}`)
      .send({
        amount: 1000,
        paymentMethod: 'gcash',
        eventId: null, // Optional
      })
      .expect(200);

    // Assert
    expect(response.body.success).toBe(true);
    expect(response.body.paymentIntent).toBeDefined();
    expect(response.body.clientKey).toBeDefined();
  });

  it('should reject donation without authentication', async () => {
    // Act
    const response = await request(app)
      .post('/api/donations')
      .send({
        amount: 1000,
        paymentMethod: 'gcash',
      })
      .expect(401);

    // Assert
    expect(response.body.success).toBe(false);
  });

  it('should reject donation with invalid amount', async () => {
    // Act
    const response = await request(app)
      .post('/api/donations')
      .set('Cookie', `token=${authToken}`)
      .send({
        amount: -100,
        paymentMethod: 'gcash',
      })
      .expect(400);

    // Assert
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('amount');
  });

  it('should reject donation with missing required fields', async () => {
    // Act
    const response = await request(app)
      .post('/api/donations')
      .set('Cookie', `token=${authToken}`)
      .send({
        // Missing amount and paymentMethod
      })
      .expect(400);

    // Assert
    expect(response.body.success).toBe(false);
  });

  it('should handle PayMongo API errors', async () => {
    // Arrange
    const paymongoClient = (await import('../../config/paymongo.js')).default;
    paymongoClient.post.mockRejectedValue(new Error('PayMongo API Error'));

    // Act
    const response = await request(app)
      .post('/api/donations')
      .set('Cookie', `token=${authToken}`)
      .send({
        amount: 1000,
        paymentMethod: 'gcash',
      })
      .expect(500);

    // Assert
    expect(response.body.success).toBe(false);
  });
});
```

---

## Running Integration Tests

### Run All Integration Tests
```bash
cd EuMatter-Thesis-Project/backend
npm test -- __tests__/integration
```

### Run Specific Test File
```bash
npm test -- auth.test.js
```

### Run with Coverage
```bash
npm run test:coverage -- __tests__/integration
```

### Run in Watch Mode
```bash
npm run test:watch -- __tests__/integration
```

---

## Test Data Management

### Using Test Fixtures

Create `backend/__tests__/fixtures/users.js`:

```javascript
export const testUsers = {
  regularUser: {
    email: 'user@mseuf.edu.ph',
    password: 'password123',
    name: 'Regular User',
    role: 'User',
  },
  crdStaff: {
    email: 'staff@mseuf.edu.ph',
    password: 'password123',
    name: 'CRD Staff',
    role: 'CRD Staff',
  },
  admin: {
    email: 'admin@mseuf.edu.ph',
    password: 'password123',
    name: 'System Admin',
    role: 'System Administrator',
  },
};
```

### Database Seeding

Create `backend/__tests__/seeders/testSeeder.js`:

```javascript
import userModel from '../../models/userModel.js';
import eventModel from '../../models/eventModel.js';
import bcrypt from 'bcryptjs';

export const seedTestData = async () => {
  // Create test users
  const users = await userModel.insertMany([
    {
      email: 'user1@mseuf.edu.ph',
      password: await bcrypt.hash('password123', 10),
      name: 'Test User 1',
      role: 'User',
      isVerified: true,
    },
    // Add more test users as needed
  ]);

  // Create test events
  const events = await eventModel.insertMany([
    {
      title: 'Test Event 1',
      description: 'Test Description',
      createdBy: users[0]._id,
      // Add more event fields
    },
  ]);

  return { users, events };
};
```

---

## Best Practices

1. **Isolation**: Each test should clean up after itself
2. **Test Database**: Use a separate test database or in-memory MongoDB
3. **Authentication**: Create helper functions for generating auth tokens
4. **Mocking External Services**: Mock third-party APIs (PayMongo, email services)
5. **Clear Test Data**: Clean database between tests to avoid side effects
6. **Realistic Data**: Use realistic test data that matches production patterns
7. **Error Scenarios**: Test both success and failure paths

---

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure MongoDB is running
   - Check connection string in `.env.test`
   - Verify network connectivity

2. **Authentication Failures**
   - Verify JWT_SECRET matches between test and app
   - Check cookie settings (secure, sameSite)
   - Ensure token format is correct

3. **Port Conflicts**
   - Use different port for test server (8001)
   - Ensure test server doesn't conflict with dev server

4. **Async/Await Issues**
   - Ensure all async operations are properly awaited
   - Use `beforeAll`/`afterAll` for setup/teardown
   - Handle promise rejections

---

## Next Steps

After completing integration tests:
1. Review test coverage
2. Fix any failing tests
3. Move to E2E Testing (see `../E2E/GUIDE.md`)

