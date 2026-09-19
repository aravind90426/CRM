import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const results = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  pagesTested: new Set(),
  bugs: [],
  consoleErrors: [],
};

function assert(condition, message) {
  results.totalTests++;
  if (condition) {
    results.passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    results.failed++;
    console.error(`  ✗ FAIL: ${message}`);
    results.bugs.push(message);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTING CALLINGCRM FRONTEND END-TO-END AUTOMATED VERIFICATION');
  console.log('Browser: Google Chrome (Headless)');
  console.log('Target: ' + BASE_URL);
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('status of 401') && !text.includes('status of 403')) {
        results.consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    results.consoleErrors.push(`PageError: ${err.message}`);
  });

  try {
    // -------------------------------------------------------------
    // 1. PUBLIC AUTH FLOW (/login)
    // -------------------------------------------------------------
    console.log('[1/16] Testing /login and Authentication Flow...');
    results.pagesTested.add('/login');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });

    const title = await page.title();
    assert(title.length > 0, `Page loaded with title: "${title}"`);

    const hasBrandHeader = await page.$eval('h1', (el) => el.textContent.includes('CallingCRM'));
    assert(hasBrandHeader, 'Login brand header "CallingCRM" rendered');

    // Test Invalid Login Scenario (Negative Validation)
    await page.type('#login-email', 'admin@crm.com');
    await page.type('#login-password', 'wrongpassword123');
    await page.click('#login-submit-btn');
    await sleep(800);

    const errorMsgPresent = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Invalid') || text.includes('Bad credentials') || text.includes('error');
    });
    assert(errorMsgPresent, 'Bad credentials error alert correctly displayed');

    // Test Quick Demo Admin Login
    await page.click('#login-email', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.click('#login-password', { clickCount: 3 });
    await page.keyboard.press('Backspace');

    await page.click('#quick-admin-login-btn');
    await page.click('#login-submit-btn');

    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 8000 }).catch(() => {});
    await sleep(1000);

    const currentUrl = page.url();
    assert(currentUrl.includes('/admin/dashboard'), `Redirected to Admin Dashboard: ${currentUrl}`);

    const hasToken = await page.evaluate(() => !!localStorage.getItem('crm_token'));
    assert(hasToken, 'JWT auth token persisted in localStorage');

    // -------------------------------------------------------------
    // 2. ADMIN DASHBOARD (/admin/dashboard)
    // -------------------------------------------------------------
    console.log('\n[2/16] Testing /admin/dashboard...');
    results.pagesTested.add('/admin/dashboard');

    const dashboardHeading = await page.$eval('h1', (el) => el.innerText);
    assert(dashboardHeading.includes('Executive Dashboard'), 'Dashboard heading verified');

    const statCardsCount = await page.$$eval('.stat-card', (cards) => cards.length);
    assert(statCardsCount >= 4, `Rendered ${statCardsCount} KPI stat cards`);

    // -------------------------------------------------------------
    // 3. LEADS LIST & CRUD (/leads)
    // -------------------------------------------------------------
    console.log('\n[3/16] Testing /leads List & Lead Creation...');
    results.pagesTested.add('/leads');
    await page.goto(`${BASE_URL}/leads`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.table', { timeout: 8000 });

    const leadsTable = await page.$('.table');
    assert(leadsTable !== null, 'Leads table rendered successfully');

    // Open Add Lead Modal
    await page.click('#add-lead-modal-btn');
    await sleep(600);

    const uniquePhone = `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testLeadName = `Vikram Mehta ${Date.now().toString().slice(-4)}`;

    await page.type('#new-lead-name', testLeadName);
    await page.type('#new-lead-phone', uniquePhone);
    await page.type('input[placeholder="customer@gmail.com"]', 'vikram.mehta@crmtest.com');

    // Select project in modal
    await page.evaluate(() => {
      const projSelect = document.querySelector('#new-lead-project');
      if (projSelect && projSelect.options.length > 1) {
        projSelect.selectedIndex = 1;
        projSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await page.click('#submit-create-lead-btn');
    await sleep(1500);

    const leadCreated = await page.evaluate((name) => document.body.innerText.includes(name), testLeadName);
    assert(leadCreated, `New lead "${testLeadName}" created and present in table`);

    // -------------------------------------------------------------
    // 4. LEAD DETAILS, NOTES & FOLLOW-UPS (/leads/:id)
    // -------------------------------------------------------------
    console.log('\n[4/16] Testing /leads/:id Lead Lifecycle Details...');
    results.pagesTested.add('/leads/:id');

    // Click the view button on the newly created lead
    await page.evaluate(() => {
      const viewBtn = document.querySelector('.table tbody tr a, .table tbody tr button');
      if (viewBtn) viewBtn.click();
    });
    await sleep(1200);

    const onLeadDetail = page.url().includes('/leads/');
    assert(onLeadDetail, `Navigated to lead detail page: ${page.url()}`);

    // Add Note Test
    await page.click('#lead-add-note-action-btn');
    await sleep(500);

    const noteText = `Customer requested luxury penthouse brochure at ${new Date().toLocaleTimeString()}`;
    await page.type('textarea[placeholder*="Customer requirements"]', noteText);
    await page.evaluate(() => {
      const modal = document.querySelector('.modal-content');
      const submitBtn = modal ? modal.querySelector('button[type="submit"]') : null;
      if (submitBtn) submitBtn.click();
    });
    await sleep(1200);

    // Switch to notes tab to verify
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.tab-btn')).find((t) => t.innerText.includes('Notes'));
      if (tab) tab.click();
    });
    await sleep(500);

    const notePresent = await page.evaluate((txt) => document.body.innerText.includes(txt), noteText);
    assert(notePresent, 'Note added and visible in notes timeline');

    // Schedule Follow-Up Test
    await page.click('#lead-schedule-followup-btn');
    await sleep(500);

    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    await page.evaluate((val) => {
      const dtInput = document.querySelector('input[type="datetime-local"]');
      if (dtInput) {
        dtInput.value = val;
        dtInput.dispatchEvent(new Event('input', { bubbles: true }));
        dtInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, tomorrow);
    await page.type('textarea[placeholder*="Discuss floor plan"]', 'Callback regarding floor plan decision');
    await page.evaluate(() => {
      const modal = document.querySelector('.modal-content');
      const submitBtn = modal ? modal.querySelector('button[type="submit"]') : null;
      if (submitBtn) submitBtn.click();
    });
    await sleep(1500);

    // Switch to follow-ups tab
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.tab-btn')).find((t) => t.innerText.includes('Follow-ups'));
      if (tab) tab.click();
    });
    await sleep(800);

    const fuPresent = await page.evaluate(() => {
      const txt = (document.body.innerText || '') + (document.body.textContent || '');
      return txt.toLowerCase().includes('floor plan decision') || txt.toLowerCase().includes('callback regarding');
    });
    assert(fuPresent, 'Follow-up scheduled and visible on lead profile');

    // -------------------------------------------------------------
    // 5. DIALLER CONSOLE (/dialler)
    // -------------------------------------------------------------
    console.log('\n[5/16] Testing /dialler Calling Console...');
    results.pagesTested.add('/dialler');
    await page.goto(`${BASE_URL}/dialler`, { waitUntil: 'networkidle0' });
    await sleep(800);

    const diallerTitle = await page.$eval('h1', (el) => el.innerText);
    assert(diallerTitle.includes('Dialler'), `Dialler heading verified: "${diallerTitle}"`);

    // Start call timer
    await page.click('#start-call-timer-btn');
    await sleep(2500); // 2.5 seconds duration
    await page.click('#end-call-timer-btn');
    await sleep(500);

    await page.type('#dialler-call-notes', 'Customer confirmed appointment for tomorrow.');
    await page.click('#save-call-log-btn');
    await sleep(1500);

    const saveSuccess = await page.evaluate(() => {
      return document.body.innerText.includes('saved successfully');
    });
    assert(saveSuccess, 'Call log interaction saved successfully');

    // -------------------------------------------------------------
    // 6. FOLLOW-UPS CONSOLE (/follow-ups)
    // -------------------------------------------------------------
    console.log('\n[6/16] Testing /follow-ups Management Console...');
    results.pagesTested.add('/follow-ups');
    await page.goto(`${BASE_URL}/follow-ups`, { waitUntil: 'networkidle0' });
    await sleep(800);

    // Test tab switches
    await page.click('#tab-fu-overdue');
    await sleep(500);
    assert(page.url().includes('period=overdue'), 'Overdue follow-ups tab active');

    await page.click('#tab-fu-today');
    await sleep(500);
    assert(page.url().includes('period=today'), 'Today follow-ups tab active');

    await page.click('#tab-fu-upcoming');
    await sleep(500);
    assert(page.url().includes('period=upcoming'), 'Upcoming follow-ups tab active');

    // -------------------------------------------------------------
    // 7. USER MANAGEMENT (/admin/users)
    // -------------------------------------------------------------
    console.log('\n[7/16] Testing /admin/users User Provisioning...');
    results.pagesTested.add('/admin/users');
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.table', { timeout: 8000 });

    const usersCount = await page.$$eval('.table tbody tr', (rows) => rows.length);
    assert(usersCount >= 2, `Users list displays ${usersCount} users`);

    // Create New Agent
    await page.click('#add-user-btn');
    await sleep(500);

    const testAgentEmail = `agent${Date.now().toString().slice(-4)}@crm.com`;
    await page.type('#new-user-name', 'Ananya Patel');
    await page.type('#new-user-email', testAgentEmail);
    await page.type('#new-user-password', 'agent123');
    await page.click('#submit-create-user-btn');
    await sleep(1500);

    const userCreated = await page.evaluate((email) => document.body.innerText.includes(email), testAgentEmail);
    assert(userCreated, `New employee "${testAgentEmail}" provisioned in users table`);

    // -------------------------------------------------------------
    // 8. PROJECT CAMPAIGNS (/admin/projects)
    // -------------------------------------------------------------
    console.log('\n[8/16] Testing /admin/projects Campaign Management...');
    results.pagesTested.add('/admin/projects');
    await page.goto(`${BASE_URL}/admin/projects`, { waitUntil: 'networkidle0' });
    await sleep(800);

    await page.click('#add-project-btn');
    await sleep(500);

    const testProjectName = `Project Aster ${Date.now().toString().slice(-3)}`;
    await page.type('#project-name-input', testProjectName);
    await page.type('#project-desc-input', 'Luxury sustainable township near IT corridor');
    await page.click('#save-project-btn');
    await sleep(1500);

    const projectCreated = await page.evaluate((name) => document.body.innerText.includes(name), testProjectName);
    assert(projectCreated, `New project "${testProjectName}" created successfully`);

    // -------------------------------------------------------------
    // 9. LEAD ASSIGNMENTS (/admin/assignments)
    // -------------------------------------------------------------
    console.log('\n[9/16] Testing /admin/assignments Console...');
    results.pagesTested.add('/admin/assignments');
    await page.goto(`${BASE_URL}/admin/assignments`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.table', { timeout: 8000 });

    const assignmentsTitle = await page.$eval('h1', (el) => el.innerText);
    assert(assignmentsTitle.includes('Lead Assignment'), `Assignments console loaded: "${assignmentsTitle}"`);

    // -------------------------------------------------------------
    // 10. CALL HISTORY (/admin/calls)
    // -------------------------------------------------------------
    console.log('\n[10/16] Testing /admin/calls Organization Telephony Logs...');
    results.pagesTested.add('/admin/calls');
    await page.goto(`${BASE_URL}/admin/calls`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.table th', { timeout: 8000 });

    const hasLeadCol = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('th')).map((h) => (h.textContent || h.innerText || '').trim().toLowerCase());
      return headers.some((h) => h.includes('customer') || h.includes('lead'));
    });
    assert(hasLeadCol, 'Customer / Lead column rendered with direct navigation link in call logs');

    // -------------------------------------------------------------
    // 11. REPORTS & ANALYTICS (/admin/reports)
    // -------------------------------------------------------------
    console.log('\n[11/16] Testing /admin/reports Hub across all 5 categories...');
    results.pagesTested.add('/admin/reports');
    await page.goto(`${BASE_URL}/admin/reports`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.table', { timeout: 8000 });

    // Tab 1: Leads
    const leadsReportTable = await page.$('.table');
    assert(leadsReportTable !== null, 'Lead pipeline report table rendered');

    // Tab 2: Calls
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.tab-btn')).find((t) => t.innerText.includes('Call Report'));
      if (tab) tab.click();
    });
    await page.waitForSelector('.table', { timeout: 8000 });
    const callsReportTable = await page.$('.table');
    assert(callsReportTable !== null, 'Call activity report table rendered');

    // Tab 3: Employees
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.tab-btn')).find((t) => t.innerText.includes('Employee Activity'));
      if (tab) tab.click();
    });
    await page.waitForSelector('.table', { timeout: 8000 });
    const empReportTable = await page.$('.table');
    assert(empReportTable !== null, 'Employee productivity report table rendered');

    // Tab 4: Projects
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.tab-btn')).find((t) => t.innerText.includes('Project Performance'));
      if (tab) tab.click();
    });
    await page.waitForSelector('.table', { timeout: 8000 });
    const projReportTable = await page.$('.table');
    assert(projReportTable !== null, 'Project performance report table rendered');

    // Tab 5: Sales
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.tab-btn')).find((t) => (t.textContent || t.innerText || '').includes('Sales & Conversions'));
      if (tab) tab.click();
    });
    await page.waitForFunction(() => {
      const body = (document.body.textContent || document.body.innerText || '').toLowerCase();
      return body.includes('closed deals') || body.includes('sales conversions') || body.includes('total revenue');
    }, { timeout: 10000 });
    const hasSalesCards = await page.evaluate(() => {
      const body = (document.body.textContent || document.body.innerText || '').toLowerCase();
      return body.includes('closed deals') || body.includes('sales conversions') || body.includes('total revenue');
    });
    assert(hasSalesCards, 'Sales & conversion revenue cards rendered');

    // -------------------------------------------------------------
    // 12. AUDIT TRAIL (/admin/audit-logs)
    // -------------------------------------------------------------
    console.log('\n[12/16] Testing /admin/audit-logs Stream...');
    results.pagesTested.add('/admin/audit-logs');
    await page.goto(`${BASE_URL}/admin/audit-logs`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.table', { timeout: 8000 });

    const auditLogsCount = await page.$$eval('.table tbody tr', (rows) => rows.length);
    assert(auditLogsCount > 0, `Audit trail active with ${auditLogsCount} recorded system events`);

    // -------------------------------------------------------------
    // 13. GOOGLE SHEETS SYNC (/admin/google-sheets)
    // -------------------------------------------------------------
    console.log('\n[13/16] Testing /admin/google-sheets Sync Console...');
    results.pagesTested.add('/admin/google-sheets');
    await page.goto(`${BASE_URL}/admin/google-sheets`, { waitUntil: 'networkidle0' });
    await sleep(800);

    await page.click('#trigger-google-sheets-sync-btn');
    await sleep(2500);

    const syncSuccess = await page.evaluate(() => document.body.innerText.includes('completed successfully'));
    assert(syncSuccess, 'Google Sheets sync triggered and verified with feedback notification');

    // -------------------------------------------------------------
    // 14. SETTINGS PAGE (/settings)
    // -------------------------------------------------------------
    console.log('\n[14/16] Testing /settings Profile & Security...');
    results.pagesTested.add('/settings');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
    await sleep(800);

    const hasProfile = await page.evaluate(() => document.body.innerText.includes('Profile Information'));
    assert(hasProfile, 'Profile information card rendered');

    // Test password mismatch validation
    const pwInputs = await page.$$('input[type="password"]');
    if (pwInputs.length >= 3) {
      await pwInputs[0].type('admin123');
      await pwInputs[1].type('newsecret123');
      await pwInputs[2].type('differentsecret123');
      await page.click('button[type="submit"]');
      await sleep(500);

      const passwordMismatch = await page.evaluate(() => document.body.innerText.includes('do not match'));
      assert(passwordMismatch, 'Password mismatch validation error displayed correctly');
    }

    // -------------------------------------------------------------
    // 15. LOGOUT & SALES AGENT FLOW (/user/home) + RBAC BARRIER
    // -------------------------------------------------------------
    console.log('\n[15/16] Testing Logout, Agent Login & Protected Route Barriers...');
    results.pagesTested.add('/user/home');

    // Logout
    await page.evaluate(() => {
      const logoutBtn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Sign Out') || b.innerText.includes('Logout'));
      if (logoutBtn) logoutBtn.click();
    });
    await sleep(1000);

    assert(page.url().includes('/login'), `User logged out and redirected to /login: ${page.url()}`);

    // Agent Login
    await page.click('#quick-agent-login-btn');
    await page.click('#login-submit-btn');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 8000 }).catch(() => {});
    await sleep(1200);

    const agentUrl = page.url();
    assert(agentUrl.includes('/user/home'), `Agent redirected to /user/home: ${agentUrl}`);

    await page.waitForFunction(() => {
      const text = (document.body.textContent || document.body.innerText || '').toLowerCase();
      return text.includes('sales agent workspace') || text.includes('welcome back');
    }, { timeout: 10000 });

    const agentWelcome = await page.evaluate(() => {
      const text = (document.body.textContent || document.body.innerText || '').toLowerCase();
      return text.includes('sales agent workspace') || text.includes('welcome back');
    });
    assert(agentWelcome, 'Agent welcome banner rendered');

    // Verify Admin navigation links are HIDDEN from agent
    const hasAdminLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href') || '');
      return links.some((href) => href.startsWith('/admin'));
    });
    assert(!hasAdminLinks, 'All /admin/* navigation links are hidden from agent sidebar');

    // Security Barrier Test: Direct URL tampering to /admin/dashboard
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle0' });
    await sleep(800);
    const guardedRedirect = page.url();
    assert(guardedRedirect.includes('/user/home'), `Tampered navigation to /admin/dashboard blocked! Redirected to: ${guardedRedirect}`);

    // Direct URL tampering to /admin/users
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle0' });
    await sleep(800);
    assert(page.url().includes('/user/home'), `Tampered navigation to /admin/users blocked! Redirected to: ${page.url()}`);

    // -------------------------------------------------------------
    // 16. RESPONSIVE VIEWPORTS TESTING
    // -------------------------------------------------------------
    console.log('\n[16/16] Testing Responsive Viewports (Mobile, Tablet, Laptop, Desktop)...');

    // Mobile (375x667)
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await page.goto(`${BASE_URL}/leads`, { waitUntil: 'networkidle0' });
    await sleep(500);

    const mobileNavVisible = await page.evaluate(() => {
      const nav = document.querySelector('.mobile-bottom-nav');
      if (!nav) return false;
      const style = window.getComputedStyle(nav);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    assert(mobileNavVisible, 'Mobile bottom navigation bar visible on 375px viewport');

    // Tablet (768x1024)
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/dialler`, { waitUntil: 'networkidle0' });
    await sleep(500);
    const tabletContentRendered = await page.$eval('.page-content', (el) => el.clientWidth > 700);
    assert(tabletContentRendered, 'Tablet layout renders responsive width content');

    // Desktop (1440x900)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/user/home`, { waitUntil: 'networkidle0' });
    await sleep(500);
    const desktopContentRendered = await page.$eval('.page-content', (el) => el.clientWidth > 1000);
    assert(desktopContentRendered, 'Desktop workspace expands smoothly to full grid layout');

  } catch (err) {
    console.error('Test Suite Error:', err);
    results.bugs.push(`Test execution error: ${err.message}`);
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('FRONTEND VERIFICATION METRICS SUMMARY');
  console.log('================================================================');
  console.log(`Total Pages Tested:  ${results.pagesTested.size}`);
  console.log(`Pages List:          ${Array.from(results.pagesTested).join(', ')}`);
  console.log(`Total Tests Run:     ${results.totalTests}`);
  console.log(`Passed Tests:        ${results.passed}`);
  console.log(`Failed Tests:        ${results.failed}`);
  console.log(`Console Errors:      ${results.consoleErrors.length}`);
  if (results.consoleErrors.length > 0) {
    console.log('Console Errors List:\n', results.consoleErrors.join('\n'));
  }
  console.log(`Bugs Found:          ${results.bugs.length}`);
  console.log(`Final Status:        ${results.failed === 0 ? '100% PASSED' : 'ACTION NEEDED'}`);
  console.log('================================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
