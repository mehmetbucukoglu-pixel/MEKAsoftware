const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });

    // login
    await page.type('input[type="email"]', 'admin@klinikapp.com');
    await page.type('input[type="password"]', 'admin123'); // assuming default from typical mock DB
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Logged in, waiting a bit...');
    await page.waitForTimeout(2000);

    await browser.close();
})();
