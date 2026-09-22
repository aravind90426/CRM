/**
 * E2E Test Suite for Firebase Authentication Migration
 * Tests:
 * 1. Admin login with Firebase credentials (admin@crm.com / admin123)
 * 2. ID token generation & verification by Spring Boot backend
 * 3. Role-based access control for ADMIN (access to /admin/dashboard, /admin/users, /leads, etc.)
 * 4. User/Agent login with Firebase credentials (agent@crm.com / agent123)
 * 5. Role-based access control for USER (access to /user/home, /leads, restricted from /admin/*)
 * 6. Invalid credentials rejection
 * 7. Deactivated user rejection (INACTIVE status in MySQL blocks API access)
 * 8. User logout flow
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBtqnhkIqRSdZ_pLA7sdWB9bKy5WQBVvGg",
  authDomain: "crmcalling-60005.firebaseapp.com",
  projectId: "crmcalling-60005",
  storageBucket: "crmcalling-60005.firebasestorage.app",
  messagingSenderId: "842884624865",
  appId: "1:842884624865:web:a73e321a2bbd98a4ade2a0",
  measurementId: "G-WQLYENBR23"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const BACKEND_URL = 'http://localhost:8080/api/v1';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`\x1b[32m✓ PASS: ${message}\x1b[0m`);
    passed++;
  } else {
    console.error(`\x1b[31m✗ FAIL: ${message}\x1b[0m`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING FIREBASE AUTHENTICATION MIGRATION TEST SUITE');
  console.log('====================================================\n');

  let adminToken = '';
  let agentToken = '';

  // 1. Invalid Login Test
  console.log('--- Test 1: Invalid Login Rejection ---');
  try {
    await signInWithEmailAndPassword(auth, 'admin@crm.com', 'wrongpassword');
    assert(false, 'Expected invalid login to throw, but it succeeded');
  } catch (err) {
    assert(err.code === 'auth/invalid-credential', 'Invalid credentials correctly rejected by Firebase');
  }

  // 2. Admin Login via Firebase
  console.log('\n--- Test 2: Admin Login via Firebase Auth ---');
  try {
    const cred = await signInWithEmailAndPassword(auth, 'admin@crm.com', 'admin123');
    adminToken = await cred.user.getIdToken(true);
    assert(!!adminToken, `Admin signed in successfully, ID Token received (length=${adminToken.length})`);

    // Verify token with Spring Boot backend: /auth/me
    const meRes = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(meRes.status === 200, `Spring Boot verified Firebase ID token and returned 200 OK`);

    const meData = await meRes.json();
    assert(meData.data.email === 'admin@crm.com', `Loaded correct MySQL user: ${meData.data.email}`);
    assert(meData.data.role === 'ROLE_ADMIN', `User has correct Spring Security role: ${meData.data.role}`);
    assert(meData.data.status === 'ACTIVE', `User has active status: ${meData.data.status}`);
  } catch (err) {
    assert(false, `Admin login failed: ${err.message}`);
  }

  // 3. Admin Authorization on Protected Endpoints
  console.log('\n--- Test 3: Admin Role Authorization ---');
  try {
    // Admin accessing Users API (ADMIN-only)
    const usersRes = await fetch(`${BACKEND_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(usersRes.status === 200, `Admin can access /users endpoint (status 200)`);

    // Admin accessing Dashboard API
    const dashRes = await fetch(`${BACKEND_URL}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(dashRes.status === 200, `Admin can access /dashboard/admin (status 200)`);

    // Admin accessing Leads API
    const leadsRes = await fetch(`${BACKEND_URL}/leads`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(leadsRes.status === 200, `Admin can access /leads (status 200)`);
  } catch (err) {
    assert(false, `Admin authorization test failed: ${err.message}`);
  }

  // 4. Sales Agent Login via Firebase
  console.log('\n--- Test 4: Sales Agent Login via Firebase Auth ---');
  try {
    await signOut(auth);
    const cred = await signInWithEmailAndPassword(auth, 'agent@crm.com', 'agent123');
    agentToken = await cred.user.getIdToken(true);
    assert(!!agentToken, `Agent signed in successfully, ID Token received`);

    const meRes = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    assert(meRes.status === 200, `Spring Boot verified Agent ID token`);
    const meData = await meRes.json();
    assert(meData.data.email === 'agent@crm.com', `Loaded agent MySQL user: ${meData.data.email}`);
    assert(meData.data.role === 'ROLE_USER', `Agent has ROLE_USER: ${meData.data.role}`);
  } catch (err) {
    assert(false, `Agent login failed: ${err.message}`);
  }

  // 5. Agent Restricted Authorization
  console.log('\n--- Test 5: Agent Restricted Authorization (RBAC) ---');
  try {
    // Agent attempting to access Admin-only Users API
    const usersRes = await fetch(`${BACKEND_URL}/users`, {
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    assert(usersRes.status === 403, `Agent is forbidden from accessing /users (status 403 Forbidden)`);

    // Agent accessing allowed Leads API
    const leadsRes = await fetch(`${BACKEND_URL}/leads`, {
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    assert(leadsRes.status === 200, `Agent can access allowed /leads endpoint`);
  } catch (err) {
    assert(false, `Agent RBAC test failed: ${err.message}`);
  }

  // 6. Deactivated User Test
  console.log('\n--- Test 6: Deactivated User Blocking ---');
  try {
    // Look up agent user by email
    const usersListRes = await fetch(`${BACKEND_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const usersList = await usersListRes.json();
    const testAgent = (usersList.data?.content || []).find(u => u.email === 'agent@crm.com');
    assert(!!testAgent, `Found target agent in MySQL: ${testAgent?.email} (id=${testAgent?.id})`);

    // 1. Deactivate agent using Admin token
    const deactivateRes = await fetch(`${BACKEND_URL}/users/${testAgent.id}/status?status=INACTIVE`, {
      method: 'PATCH',
      headers: { 
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert(deactivateRes.status === 200, `Admin deactivated agent in MySQL (status 200)`);

    // 2. Sign in as agent via Firebase
    await signOut(auth);
    const agentCred = await signInWithEmailAndPassword(auth, 'agent@crm.com', 'agent123');
    const freshAgentToken = await agentCred.user.getIdToken(true);
    assert(!!freshAgentToken, `Agent authenticated with Firebase`);

    // 3. Attempt API request to backend with deactivated agent token
    const blockedRes = await fetch(`${BACKEND_URL}/leads`, {
      headers: { Authorization: `Bearer ${freshAgentToken}` }
    });
    assert(blockedRes.status === 401 || blockedRes.status === 403, `Spring Boot blocked deactivated user from API access (status ${blockedRes.status})`);

    // 4. Restore agent to ACTIVE
    const reactivateRes = await fetch(`${BACKEND_URL}/users/${testAgent.id}/status?status=ACTIVE`, {
      method: 'PATCH',
      headers: { 
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert(reactivateRes.status === 200, `Restored agent status to ACTIVE in MySQL`);
  } catch (err) {
    assert(false, `Deactivated user test failed: ${err.message}`);
  }

  // 7. Sign Out
  console.log('\n--- Test 7: Sign Out ---');
  try {
    await signOut(auth);
    assert(auth.currentUser === null, `Firebase user successfully signed out (currentUser is null)`);
  } catch (err) {
    assert(false, `Signout failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
