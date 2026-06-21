const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// الصفحة الرئيسية
app.get('/', (req, res) => {
  const targetUrl = req.query.url || 'https://animeslayer.to/home';
  const proxyUrl = `/proxy?url=${encodeURIComponent(targetUrl)}`;
  res.send(`
    <!DOCTYPE html>
    <html lang="ar">
    <head><meta charset="UTF-8"><title>Anime - No Ads</title>
    <style>*{margin:0;padding:0}body{background:#000;height:100vh}iframe{width:100%;height:100%;border:none}</style>
    </head>
    <body>
      <iframe src="${proxyUrl}" sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"></iframe>
    </body>
    </html>
  `);
});

// وكيل يزيل الإعلانات من المصدر
app.get('/proxy', async (req, res) => {
  const url = req.query.url || 'https://animeslayer.to/home';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) return res.status(500).send('Failed to fetch');
    let html = await response.text();

    // ===== إزالة الإعلانات من الـ HTML مباشرة (Regex) =====
    // 1. إزالة الأقسام الإعلانية المعروفة
    html = html.replace(/<div[^>]*id\s*=\s*["'](overlay|wrap|card)["'][^>]*>[\s\S]*?<\/div>/gi, '');
    // 2. إزالة أي عنصر يحتوي على النصوص الإعلانية
    html = html.replace(/<div[^>]*>[\s\S]*?(شاهد هذا الإعلان|تبرع للتطبيق|ساعدنا في تغطية)[\s\S]*?<\/div>/gi, '');
    // 3. إزالة الأزرار الإعلانية
    html = html.replace(/<button[^>]*id\s*=\s*["'](b1|b2)["'][^>]*>[\s\S]*?<\/button>/gi, '');
    // 4. إزالة أي div position:fixed و z-index عالي
    html = html.replace(/<div[^>]*style\s*=\s*["'][^"']*position\s*:\s*fixed[^"']*z-index\s*:\s*(9999|99999)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');

    // ===== حقن CSS و JavaScript للحماية الإضافية =====
    const adBlock = `
    <style>
      #overlay, #wrap, #card, #b1, #b2,
      .popup, .ad, .ads, .banner, .overlay, .modal,
      [class*="popup"], [id*="popup"], [class*="ad-"], [id*="ad-"],
      div[style*="position: fixed"][style*="z-index: 9999"],
      div[style*="position: fixed"][style*="z-index: 99999"] {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
        pointer-events: none !important; position: absolute !important;
        top: -9999px !important; left: -9999px !important;
      }
    </style>
    <script>
      (function() {
        function kill() {
          var ids = ['overlay','wrap','card','b1','b2'];
          ids.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.remove();
          });
          var all = document.querySelectorAll('div, section, aside');
          for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (el.textContent.includes('شاهد هذا الإعلان') || el.textContent.includes('تبرع للتطبيق')) {
              el.remove();
            }
            var s = window.getComputedStyle(el);
            if (s.position === 'fixed' && parseInt(s.zIndex) > 9999 && !el.querySelector('video') && !el.querySelector('iframe')) {
              el.remove();
            }
          }
        }
        kill();
        setInterval(kill, 300);
        new MutationObserver(kill).observe(document.documentElement, {childList:true, subtree:true});
        window.open = function(){return null;};
        Object.defineProperty(window, 'open', {value: function(){return null;}, writable:false});
        window.onbeforeunload = function(){return '';};
        document.addEventListener('click', function(e) {
          var a = e.target.closest('a');
          if (a && a.target === '_blank' && !a.href.includes(location.hostname)) {
            e.preventDefault(); e.stopPropagation();
          }
          if (e.target.id === 'b2' || (e.target.textContent && e.target.textContent.includes('شاهد الآن'))) {
            e.preventDefault(); e.stopPropagation(); kill();
          }
        }, true);
      })();
    </script>`;

    // إضافة base + المحتوى الواقي
    html = html.replace('<head>', `<head><base href="${url}">`);
    html = html.replace('</body>', adBlock + '</body>');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

app.listen(PORT, () => console.log('Proxy running on port ' + PORT));
