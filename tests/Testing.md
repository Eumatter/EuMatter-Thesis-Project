# Minimal Testing Package (MTP) – 1-Day Testing Plan

| **Test Type** | **Description / What to Test** | **Estimated Time** | **Tools** |
|---------------|-------------------------------|-----------------|-----------|
| **Basic Unit Tests** | - Test 3–4 backend API controllers (login, create donation, register volunteer) <br> - Test 2–3 React components (forms only) | 2 hours | Jest, React Testing Library |
| **Basic Integration Tests** | - Test 2 API endpoints with Supertest: <br> • POST /auth/login <br> • POST /donations/create | 1 hour | Supertest, Jest |
| **One E2E Flow** | - Pick ONE MAIN FLOW ONLY: <br> • User login → donate → confirmation page <br> • OR Volunteer registers → dashboard updates | 2 hours | Cypress or Playwright |
| **PWA + Performance Quick Checks** | - Run automated Lighthouse for: <br> • PWA score <br> • Performance <br> • Installability <br> • Offline capability | 30 minutes | Chrome Lighthouse |
| **Security Quick Scan** | - Run `npm audit` <br> - Run Snyk scan (free tier) <br> - Quick OWASP ZAP passive scan (optional) | 30 minutes | npm audit, Snyk, OWASP ZAP |
| **Accessibility Quick Check** | - Run Lighthouse accessibility <br> - No need for manual testing | 10 minutes | Chrome Lighthouse |
