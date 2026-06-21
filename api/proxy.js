const chromium = require('chrome-aws-lambda');

module.exports = async (req, res) => {
  const url = req.query.url || 'https://animeslayer.to/home';

  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  let browser = null;
  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    // إزالة الإعلانات بعد تحميل الصفحة
    await page.evaluate(() => {
      // إزالة العناصر المعروفة
      const selectors = ['#overlay', '#wrap', '#card', '#b1', '#b2'];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });
      // إزالة أي عنصر كبير ثابت
      document.querySelectorAll('div, section, aside').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && parseInt(style.zIndex) > 9999) {
          el.remove();
        }
      });
      // إزالة النصوص الإعلانية
      document.querySelectorAll('*').forEach(el => {
        if (el.textContent.includes('شاهد هذا الإعلان') || el.textContent.includes('تبرع للتطبيق')) {
          el.closest('div')?.remove();
        }
      });
    });

    const html = await page.content();
    await browser.close();

    // إضافة base للروابط
    const finalHtml = html.replace('<head>', `<head><base href="${url}">`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(finalHtml);
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).send('Error: ' + error.message);
  }
};