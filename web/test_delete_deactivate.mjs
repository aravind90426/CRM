import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('VERIFYING DELETE OPTIONS & DEACTIVATE FIXES (USERS, PROJECTS, LEADS)');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 1. LOGIN AS ADMIN
    console.log('[1/5] Logging in as Administrator...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.click('#quick-admin-login-btn');
    await page.click('#login-submit-btn');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 8000 }).catch(() => {});
    await sleep(1000);
    assert(page.url().includes('/admin/dashboard'), 'Admin logged in successfully');

    // 2. USERS: DEACTIVATE, ACTIVATE, AND DELETE
    console.log('\n[2/5] Testing User Deactivate, Activate, and Delete...');
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.table tbody tr', { timeout: 8000 });

    // Create a dedicated test user to toggle status and delete
    const testUserEmail = `test_del_${Date.now()}@crm.com`;
    await page.click('#add-user-btn');
    await sleep(400);
    await page.type('#new-user-name', 'Temporary Test Rep');
    await page.type('#new-user-email', testUserEmail);
    await page.type('#new-user-password', 'password123');
    await page.click('#submit-create-user-btn');
    await sleep(1500);

    const userCreated = await page.evaluate((email) => document.body.innerText.includes(email), testUserEmail);
    assert(userCreated, `Test user "${testUserEmail}" created`);

    // Toggle: Deactivate
    await page.evaluate((email) => {
      const rows = Array.from(document.querySelectorAll('.table tbody tr'));
      const target = rows.find((r) => r.innerText.includes(email));
      if (target) {
        const toggleBtn = target.querySelector('button[id^="toggle-user-"]');
        if (toggleBtn) toggleBtn.click();
      }
    }, testUserEmail);
    await sleep(1500);

    const isDeactivated = await page.evaluate((email) => {
      const rows = Array.from(document.querySelectorAll('.table tbody tr'));
      const target = rows.find((r) => r.innerText.includes(email));
      return target ? target.innerText.includes('INACTIVE') : false;
    }, testUserEmail);
    assert(isDeactivated, 'User successfully DEACTIVATED (status changed to INACTIVE)');

    // Toggle: Activate back
    await page.evaluate((email) => {
      const rows = Array.from(document.querySelectorAll('.table tbody tr'));
      const target = rows.find((r) => r.innerText.includes(email));
      if (target) {
        const toggleBtn = target.querySelector('button[id^="toggle-user-"]');
        if (toggleBtn) toggleBtn.click();
      }
    }, testUserEmail);
    await sleep(1500);

    const isActivated = await page.evaluate((email) => {
      const rows = Array.from(document.querySelectorAll('.table tbody tr'));
      const target = rows.find((r) => r.innerText.includes(email));
      return target ? target.innerText.includes('ACTIVE') && !target.innerText.includes('INACTIVE') : false;
    }, testUserEmail);
    assert(isActivated, 'User successfully ACTIVATED (status restored to ACTIVE)');

    // Delete User
    await page.evaluate((email) => {
      const rows = Array.from(document.querySelectorAll('.table tbody tr'));
      const target = rows.find((r) => r.innerText.includes(email));
      if (target) {
        const delBtn = target.querySelector('button[id^="delete-user-"]');
        if (delBtn) delBtn.click();
      }
    }, testUserEmail);
    await sleep(600);

    // Confirm modal should appear
    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.modal-content');
      return modal && modal.innerText.includes('Delete User Account');
    });
    assert(modalVisible, 'Delete user confirmation modal displayed');

    await page.click('#confirm-delete-user-btn');
    await sleep(1500);

    const userGone = await page.evaluate((email) => !document.body.innerText.includes(email), testUserEmail);
    assert(userGone, `User "${testUserEmail}" successfully DELETED from system`);

    // 3. PROJECTS: DEACTIVATE, ACTIVATE, AND DELETE
    console.log('\n[3/5] Testing Project Deactivate, Activate, and Delete...');
    await page.goto(`${BASE_URL}/admin/projects`, { waitUntil: 'networkidle0' });
    await sleep(800);

    const testProjectName = `Campaign Alpha ${Date.now() % 10000}`;
    await page.click('#add-project-btn');
    await sleep(400);
    await page.type('#project-name-input', testProjectName);
    await page.type('#project-desc-input', 'Test campaign for delete and deactivate verification.');
    await page.click('#save-project-btn');
    await sleep(1500);

    const projCreated = await page.evaluate((name) => document.body.innerText.includes(name), testProjectName);
    assert(projCreated, `Project "${testProjectName}" created successfully`);

    // Deactivate Project
    await page.evaluate((name) => {
      const cards = Array.from(document.querySelectorAll('.card'));
      const target = cards.find((c) => c.innerText.includes(name));
      if (target) {
        const toggleBtn = target.querySelector('button[id^="toggle-project-"]');
        if (toggleBtn) toggleBtn.click();
      }
    }, testProjectName);
    await sleep(1500);

    const projDeactivated = await page.evaluate((name) => {
      const cards = Array.from(document.querySelectorAll('.card'));
      const target = cards.find((c) => c.innerText.includes(name));
      return target ? target.innerText.includes('INACTIVE') : false;
    }, testProjectName);
    assert(projDeactivated, 'Project campaign successfully DEACTIVATED (status changed to INACTIVE)');

    // Activate Project
    await page.evaluate((name) => {
      const cards = Array.from(document.querySelectorAll('.card'));
      const target = cards.find((c) => c.innerText.includes(name));
      if (target) {
        const toggleBtn = target.querySelector('button[id^="toggle-project-"]');
        if (toggleBtn) toggleBtn.click();
      }
    }, testProjectName);
    await sleep(1500);

    const projActivated = await page.evaluate((name) => {
      const cards = Array.from(document.querySelectorAll('.card'));
      const target = cards.find((c) => c.innerText.includes(name));
      return target ? target.innerText.includes('ACTIVE') && !target.innerText.includes('INACTIVE') : false;
    }, testProjectName);
    assert(projActivated, 'Project campaign successfully ACTIVATED (status restored to ACTIVE)');

    // Delete Project
    await page.evaluate((name) => {
      const cards = Array.from(document.querySelectorAll('.card'));
      const target = cards.find((c) => c.innerText.includes(name));
      if (target) {
        const delBtn = target.querySelector('button[id^="delete-project-"]');
        if (delBtn) delBtn.click();
      }
    }, testProjectName);
    await sleep(600);

    const projModalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.modal-content');
      return modal && modal.innerText.includes('Delete Project Campaign');
    });
    assert(projModalVisible, 'Delete project confirmation modal displayed');

    await page.click('#confirm-delete-project-btn');
    await sleep(1500);

    const projGone = await page.evaluate((name) => !document.body.innerText.includes(name), testProjectName);
    assert(projGone, `Project "${testProjectName}" successfully DELETED from system`);

    // 4. LEADS: DELETE FROM /leads TABLE
    console.log('\n[4/5] Testing Lead Delete from Leads Table (/leads)...');
    await page.goto(`${BASE_URL}/leads`, { waitUntil: 'networkidle0' });
    await sleep(800);

    const testLeadName1 = `Lead For Delete ${Date.now() % 10000}`;
    await page.click('#add-lead-modal-btn');
    await sleep(400);
    await page.type('#new-lead-name', testLeadName1);
    await page.type('#new-lead-phone', `+91 99${Math.floor(10000000 + Math.random() * 89999999)}`);
    await page.type('#new-lead-email', `temp_${Date.now()}@example.com`);
    await page.evaluate(() => {
      const sel = document.querySelector('#new-lead-project');
      if (sel && sel.options.length > 1) {
        sel.selectedIndex = 1;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.click('#submit-create-lead-btn');
    await sleep(1500);

    const lead1Created = await page.evaluate((name) => document.body.innerText.includes(name), testLeadName1);
    assert(lead1Created, `Lead "${testLeadName1}" created in table`);

    // Click delete lead in table
    await page.evaluate((name) => {
      const rows = Array.from(document.querySelectorAll('.table tbody tr'));
      const target = rows.find((r) => r.innerText.includes(name));
      if (target) {
        const delBtn = target.querySelector('button[id^="delete-lead-"]');
        if (delBtn) delBtn.click();
      }
    }, testLeadName1);
    await sleep(600);

    const leadModalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.modal-content');
      return modal && modal.innerText.includes('Delete Customer Lead');
    });
    assert(leadModalVisible, 'Delete lead confirmation modal displayed');

    await page.click('#confirm-delete-lead-btn');
    await sleep(1500);

    const lead1Gone = await page.evaluate((name) => !document.body.innerText.includes(name), testLeadName1);
    assert(lead1Gone, `Lead "${testLeadName1}" successfully DELETED from table`);

    // 5. LEADS: DELETE FROM /leads/:id DETAILS PAGE
    console.log('\n[5/5] Testing Lead Delete from Lead Details Page (/leads/:id)...');
    const testLeadName2 = `Lead Detail Del ${Date.now() % 10000}`;
    await page.click('#add-lead-modal-btn');
    await sleep(400);
    await page.type('#new-lead-name', testLeadName2);
    await page.type('#new-lead-phone', `+91 98${Math.floor(10000000 + Math.random() * 89999999)}`);
    await page.evaluate(() => {
      const sel = document.querySelector('#new-lead-project');
      if (sel && sel.options.length > 1) {
        sel.selectedIndex = 1;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.click('#submit-create-lead-btn');
    await sleep(1500);

    // Open detail page
    await page.evaluate((name) => {
      const rows = Array.from(document.querySelectorAll('.table tbody tr'));
      const target = rows.find((r) => r.innerText.includes(name));
      if (target) {
        const viewBtn = target.querySelector('button[id^="view-lead-"]');
        if (viewBtn) viewBtn.click();
      }
    }, testLeadName2);
    await sleep(1200);

    assert(page.url().includes('/leads/'), `Navigated to lead details: ${page.url()}`);

    // Click "Delete Lead" in header
    await page.click('#lead-delete-action-btn');
    await sleep(600);

    const detailModalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.modal-content');
      return modal && modal.innerText.includes('Delete Customer Lead');
    });
    assert(detailModalVisible, 'Delete lead modal displayed on details page');

    await page.click('#confirm-delete-lead-detail-btn');
    await sleep(1500);

    assert(page.url().endsWith('/leads'), `Navigated back to /leads after deletion: ${page.url()}`);
    const lead2Gone = await page.evaluate((name) => !document.body.innerText.includes(name), testLeadName2);
    assert(lead2Gone, `Lead "${testLeadName2}" confirmed removed after detail deletion`);

    console.log('\n================================================================');
    console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
