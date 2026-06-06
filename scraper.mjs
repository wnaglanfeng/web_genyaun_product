/**
 * 100gsoft.cn 产品信息爬虫 (Node.js版)
 * 用法: node scraper.mjs <产品页面URL>
 * 示例: node scraper.mjs https://www.100gsoft.cn/sjsoft/512688.html
 */

import * as https from 'https';
import * as http from 'http';

const URL = process.argv[2];

if (!URL) {
  console.log('用法: node scraper.mjs <产品页面URL>');
  console.log('示例: node scraper.mjs https://www.100gsoft.cn/sjsoft/512688.html');
  process.exit(1);
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        return resolve(fetchHtml(redirectUrl));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractInfo(html, url) {
  const info = {
    name: '',
    icon: '',
    description: '',
    features: [],
    category: '工具',
    platforms: ['iOS', 'Android'],
    downloads: [],
    color: '#3b82f6',
  };

  // --- 产品名称: <h1> 或 <title> ---
  let m = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  if (m) info.name = m[1].trim();
  if (!info.name) {
    m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (m) info.name = m[1].trim().replace(/[-_|].*$/, '').trim();
  }
  if (!info.name) {
    info.name = url.split('/').pop().replace('.html', '');
  }

  // --- 图标 ---
  m = html.match(/<img[^>]*src\s*=\s*["']([^"']*(?:icon|logo|app|img)[^"']*(?:\.png|\.jpg|\.webp)[^"']*)["'][^>]*>/i);
  if (!m) m = html.match(/<img[^>]*src\s*=\s*["']([^"']*\.(?:png|jpg|webp)[^"']*)["'][^>]*>/i);
  if (m) {
    let src = m[1];
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/')) src = 'https://www.100gsoft.cn' + src;
    info.icon = src;
  }

  // --- Meta description ---
  m = html.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i);
  if (!m) m = html.match(/<meta[^>]*content\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']description["'][^>]*>/i);
  if (m) info.description = m[1].trim();

  // --- 功能/标签 ---
  const tagRe = /<span[^>]*class\s*=\s*["'][^"']*(?:tag|feature|label|func)[^"']*["'][^>]*>([^<]*)<\/span>/gi;
  let tagMatch;
  while ((tagMatch = tagRe.exec(html)) !== null) {
    const t = tagMatch[1].trim();
    if (t && t.length < 20 && !info.features.includes(t)) {
      info.features.push(t);
    }
  }

  // --- 分类 ---
  m = html.match(/<a[^>]*class\s*=\s*["'][^"']*(?:category|breadcrumb)[^"']*["'][^>]*>([^<]*)<\/a>/i);
  if (m) info.category = m[1].trim();

  // --- 平台 ---
  if (/ios|iphone|ipad/i.test(html)) info.platforms = info.platforms.includes('iOS') ? info.platforms : ['iOS', ...info.platforms];
  if (/android/i.test(html)) info.platforms = info.platforms.includes('Android') ? info.platforms : [...info.platforms, 'Android'];
  info.platforms = [...new Set(info.platforms)];

  // --- 下载链接 ---
  const linkRe = /<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*class\s*=\s*["'][^"']*(?:down|btn|download)[^"']*["'][^>]*>([^<]*)<\/a>/gi;
  let linkMatch;
  const seen = new Set();
  while ((linkMatch = linkRe.exec(html)) !== null) {
    let href = linkMatch[1];
    let label = linkMatch[2].trim() || '下载';
    if (href && !seen.has(href) && !href.startsWith('#') && !href.startsWith('javascript')) {
      seen.add(href);
      if (href.startsWith('/')) href = 'https://www.100gsoft.cn' + href;
      else if (href.startsWith('//')) href = 'https:' + href;
      info.downloads.push({ platform: label.includes('iOS') ? 'iOS' : 'Android', url: href, label });
    }
  }

  // 兜底
  if (!info.downloads.length) {
    info.downloads = [
      { platform: 'iOS', url: url, label: '查看详情' },
      { platform: 'Android', url: url, label: '查看详情' },
    ];
  }
  if (!info.features.length) info.features = ['请补充功能描述'];
  if (!info.description) info.description = `${info.name}，一款优秀的手机应用。`;

  return info;
}

// ===== 运行 =====
console.log(`正在请求: ${URL}`);

try {
  const html = await fetchHtml(URL);
  const product = extractInfo(html, URL);

  console.log('\n' + '='.repeat(60));
  console.log(`产品名称: ${product.name}`);
  console.log(`图标地址: ${product.icon || '(未找到)'}`);
  console.log(`分类: ${product.category}`);
  console.log(`描述: ${product.description}`);
  console.log(`功能: ${product.features.join(', ')}`);
  console.log(`平台: ${product.platforms.join(', ')}`);
  console.log('下载:');
  product.downloads.forEach(d => console.log(`  - ${d.label}: ${d.url}`));
  console.log('='.repeat(60));

  // 输出 JS 数据格式
  const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#059669', '#d946ef', '#0ea5e9', '#6366f1'];
  console.log('\n--- JS 产品数据 ---');
  console.log(`  {`);
  console.log(`    id: 1,`);
  console.log(`    name: '${product.name}',`);
  console.log(`    subtitle: '${product.name}',`);
  console.log(`    icon: '${product.icon}',`);
  console.log(`    description: '${product.description}',`);
  console.log(`    features: ${JSON.stringify(product.features)},`);
  console.log(`    category: '${product.category}',`);
  console.log(`    platforms: ${JSON.stringify(product.platforms)},`);
  console.log(`    downloads: ${JSON.stringify(product.downloads, null, 6)},`);
  console.log(`    color: '${colors[0]}',`);
  console.log(`  },`);

} catch (err) {
  console.error('爬取失败:', err.message);
}
