# Testing Documentation

This directory contains comprehensive testing guides for the EuMatter project, organized by test type according to the Minimal Testing Package (MTP) 1-Day Testing Plan.

## 📁 Test Type Directories

Each directory contains a detailed `GUIDE.md` file with step-by-step instructions:

### 1. [Unit Tests](./Unit/GUIDE.md)
- **Time:** 2 hours
- **Tools:** Jest, React Testing Library
- **Scope:** Backend controllers (login, create donation, register volunteer) and React components (forms)
- **Guide:** [Unit Testing Guide](./Unit/GUIDE.md)

### 2. [Integration Tests](./Integration/GUIDE.md)
- **Time:** 1 hour
- **Tools:** Supertest, Jest
- **Scope:** API endpoints (POST /auth/login, POST /donations/create)
- **Guide:** [Integration Testing Guide](./Integration/GUIDE.md)

### 3. [E2E Tests](./E2E/GUIDE.md)
- **Time:** 2 hours
- **Tools:** Cypress or Playwright
- **Scope:** Complete user flows (Login → Donate → Confirmation OR Volunteer Register → Dashboard Update)
- **Guide:** [E2E Testing Guide](./E2E/GUIDE.md)

### 4. [PWA Tests](./PWA/GUIDE.md)
- **Time:** 30 minutes
- **Tools:** Chrome Lighthouse
- **Scope:** PWA score, Performance, Installability, Offline capability
- **Guide:** [PWA Testing Guide](./PWA/GUIDE.md)

### 5. [Security Tests](./Security/GUIDE.md)
- **Time:** 30 minutes
- **Tools:** npm audit, Snyk, OWASP ZAP (optional)
- **Scope:** Dependency vulnerabilities, security best practices
- **Guide:** [Security Testing Guide](./Security/GUIDE.md)

### 6. [Accessibility Tests](./Accessibility/GUIDE.md)
- **Time:** 10 minutes
- **Tools:** Chrome Lighthouse
- **Scope:** WCAG compliance, keyboard navigation, screen reader support
- **Guide:** [Accessibility Testing Guide](./Accessibility/GUIDE.md)

## 🚀 Quick Start

1. **Start with Unit Tests** - Test individual components and functions
2. **Move to Integration Tests** - Test API endpoints
3. **Run E2E Tests** - Test complete user flows
4. **Perform PWA Testing** - Verify Progressive Web App features
5. **Run Security Scans** - Check for vulnerabilities
6. **Test Accessibility** - Ensure WCAG compliance

## 📋 Testing Plan Overview

Refer to [Testing.md](./Testing.md) for the complete 1-Day Testing Plan overview.

## 📝 Notes

- Each guide includes setup instructions, example code, and troubleshooting tips
- All guides are designed to be followed independently
- Estimated times are approximate and may vary based on project complexity
- Some tests require the application to be running (E2E, PWA, Accessibility)

## 🔗 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Cypress Documentation](https://docs.cypress.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Snyk Documentation](https://docs.snyk.io/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

