# Unit Testing Guide

## Overview
This guide provides step-by-step instructions for setting up and running unit tests for the EuMatter project. Unit tests focus on testing individual functions, controllers, and components in isolation.

**Estimated Time:** 2 hours  
**Tools:** Jest, React Testing Library

---

## Prerequisites

1. Node.js (v18 or higher)
2. npm or yarn package manager
3. Basic understanding of Jest and React Testing Library

---

## Setup Instructions

### 1. Install Testing Dependencies

#### Backend Setup
Navigate to the backend directory and install Jest and related dependencies:

```bash
cd EuMatter-Thesis-Project/backend
npm install --save-dev jest @jest/globals supertest
```

#### Frontend Setup
Navigate to the frontend directory and install React Testing Library and related dependencies:

```bash
cd EuMatter-Thesis-Project/frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react jsdom
```

### 2. Configure Jest

#### Backend Jest Configuration
Create `backend/jest.config.js`:

```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
```

#### Frontend Jest Configuration
Create `frontend/jest.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
});
```

Create `frontend/src/setupTests.js`:

```javascript
import '@testing-library/jest-dom';
```

### 3. Update package.json Scripts

#### Backend package.json
Add test scripts to `backend/package.json`:

```json
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "node --experimental-vm-modules node_modules/jest/bin/jest.js --watch",
    "test:coverage": "node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage"
  }
}
```

#### Frontend package.json
Add test scripts to `frontend/package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## Testing Backend Controllers

### Test 1: Login Controller (`authController.js`)

Create `backend/__tests__/controllers/authController.test.js`:

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import userModel from '../../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../models/userModel.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../config/nodemailer.js');
jest.mock('../auditLogController.js');

describe('Auth Controller - Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login user with valid credentials', async () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@mseuf.edu.ph',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'User',
      isVerified: true,
    };

    userModel.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mockToken');

    // Import login function (adjust import based on your export structure)
    // const { login } = await import('../../controllers/authController.js');
    
    // Test implementation
    expect(userModel.findOne).toHaveBeenCalled();
  });

  it('should reject login with invalid email', async () => {
    userModel.findOne.mockResolvedValue(null);

    // Test implementation
    expect(userModel.findOne).toHaveBeenCalled();
  });

  it('should reject login with invalid password', async () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@mseuf.edu.ph',
      password: 'hashedPassword',
    };

    userModel.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    // Test implementation
  });
});
```

### Test 2: Create Donation Controller (`donationController.js`)

Create `backend/__tests__/controllers/donationController.test.js`:

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import donationModel from '../../models/donationModel.js';
import paymongoClient from '../../config/paymongo.js';

jest.mock('../../models/donationModel.js');
jest.mock('../../config/paymongo.js');
jest.mock('../auditLogController.js');

describe('Donation Controller - Create Donation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create donation with valid data', async () => {
    const mockDonation = {
      _id: 'donation123',
      userId: 'user123',
      amount: 1000,
      paymentMethod: 'gcash',
      status: 'pending',
    };

    donationModel.create.mockResolvedValue(mockDonation);

    // Test implementation
  });

  it('should reject donation with invalid amount', async () => {
    // Test implementation for validation
  });

  it('should handle PayMongo API errors', async () => {
    paymongoClient.post.mockRejectedValue(new Error('PayMongo API Error'));

    // Test implementation
  });
});
```

### Test 3: Register Volunteer Controller (`volunteerController.js`)

Create `backend/__tests__/controllers/volunteerController.test.js`:

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import eventModel from '../../models/eventModel.js';
import userModel from '../../models/userModel.js';

jest.mock('../../models/eventModel.js');
jest.mock('../../models/userModel.js');
jest.mock('../auditLogController.js');

describe('Volunteer Controller - Register Volunteer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register volunteer for event', async () => {
    const mockEvent = {
      _id: 'event123',
      title: 'Test Event',
      volunteerRegistrations: [],
      save: jest.fn().mockResolvedValue(true),
    };

    eventModel.findById.mockResolvedValue(mockEvent);

    // Test implementation
  });

  it('should reject duplicate volunteer registration', async () => {
    const mockEvent = {
      _id: 'event123',
      volunteerRegistrations: [
        { user: 'user123', status: 'registered' }
      ],
    };

    eventModel.findById.mockResolvedValue(mockEvent);

    // Test implementation
  });
});
```

---

## Testing Frontend Components

### Test 1: Login Form Component

Create `frontend/src/components/__tests__/LoginPage.test.jsx`:

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/auth/LoginPage';
import axios from 'axios';

jest.mock('axios');

describe('LoginPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid credentials', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({ data: { success: true } });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'test@mseuf.edu.ph');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          email: 'test@mseuf.edu.ph',
          password: 'password123',
        })
      );
    });
  });
});
```

### Test 2: Donation Form Component

Create `frontend/src/components/__tests__/DonationForm.test.jsx`:

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonationForm from '../DonationForm';
import axios from 'axios';

jest.mock('axios');

describe('DonationForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render donation form fields', () => {
    render(<DonationForm />);

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
  });

  it('should validate minimum donation amount', async () => {
    const user = userEvent.setup();
    render(<DonationForm />);

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, '0');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/minimum amount/i)).toBeInTheDocument();
    });
  });

  it('should submit donation with valid data', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({ data: { success: true, donationId: '123' } });

    render(<DonationForm />);

    await user.type(screen.getByLabelText(/amount/i), '1000');
    await user.selectOptions(screen.getByLabelText(/payment method/i), 'gcash');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });
});
```

---

## Running Tests

### Run All Tests
```bash
# Backend
cd EuMatter-Thesis-Project/backend
npm test

# Frontend
cd EuMatter-Thesis-Project/frontend
npm test
```

### Run Tests in Watch Mode
```bash
# Backend
npm run test:watch

# Frontend
npm run test:watch
```

### Generate Coverage Report
```bash
# Backend
npm run test:coverage

# Frontend
npm run test:coverage
```

### Run Specific Test File
```bash
# Backend
npm test authController.test.js

# Frontend
npm test LoginPage.test.jsx
```

---

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies (database, APIs, file system)
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
4. **Descriptive Names**: Use clear test names that describe what is being tested
5. **Coverage**: Aim for at least 70% code coverage on critical paths
6. **Fast Execution**: Keep unit tests fast (under 100ms per test)

---

## Troubleshooting

### Common Issues

1. **ES Module Import Errors**
   - Ensure Jest is configured for ES modules
   - Use `--experimental-vm-modules` flag

2. **Mock Not Working**
   - Verify mock paths match actual import paths
   - Clear Jest cache: `npm test -- --clearCache`

3. **React Component Not Rendering**
   - Ensure all required providers (Router, Context) are included
   - Check for missing dependencies in setupTests.js

---

## Next Steps

After completing unit tests:
1. Review coverage reports
2. Fix any failing tests
3. Move to Integration Testing (see `../Integration/GUIDE.md`)

