import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imgDir = path.join(__dirname, 'public', 'images');
fs.mkdirSync(imgDir, { recursive: true });

// ===== Config =====
const TOKEN = process.env.BUDDY_CLOUD_TOKEN || '';
const ENDPOINT = 'copilot.tencent.com';
const REGION = 'ap-guangzhou';
const SIGNING_KEY = 'codebuddy';

// Provider/service mappings
const PROVIDERS = {
  image: { provider: 'aHktaW1hZ2UtdjM=', service: 'aHVueXVhbg==', version: '2023-09-01', submitAction: 'U3VibWl0SHVueXVhbkltYWdlSm9i', queryAction: 'UXVlcnlIdW55dWFuSW1hZ2VKb2I=' },
};

function b64decode(s) { return Buffer.from(s, 'base64').toString(); }

function sha256Hex(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
function hmacSha256(key, msg) { return crypto.createHmac('sha256', key).update(msg).digest(); }

function signRequest(secretId, secretKey, service, action, version, region, host, payload, timestamp) {
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];
  const method = 'POST';
  const uri = '/';
  const querystring = '';
  const contentType = 'application/json; charset=utf-8';
  const signedHeaders = 'content-type;host;x-tc-action';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const hashedPayload = sha256Hex(payload);

  const canonicalRequest = `${method}\n${uri}\n${querystring}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;

  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonical = sha256Hex(canonicalRequest);
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonical}`;

  const secretDate = hmacSha256(Buffer.from('TC3') + secretKey, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');

  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Authorization': authorization,
    'Content-Type': contentType,
    'Host': host,
    'X-TC-Action': action,
    'X-TC-Version': version,
    'X-TC-Region': region,
    'X-TC-Timestamp': String(timestamp),
  };
}

function callApi(provider, service, version, action, body, token) {
  return new Promise((resolve, reject) => {
    const secretId = `${b64decode(provider)}.${token}`;
    const secretKey = SIGNING_KEY;
    const host = ENDPOINT;
    const payload = JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000);

    const headers = signRequest(secretId, secretKey, b64decode(service), b64decode(action), version, REGION, host, payload, timestamp);

    const options = {
      hostname: host,
      port: 443,
      path: '/agenttool/v1/tcproxy',
      method: 'POST',
      headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.Response?.Error) {
            reject(new Error(result.Response.Error.Message));
          } else {
            resolve(result.Response || result);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function pollJob(provider, service, version, queryAction, jobId, token, interval = 5, maxTime = 300) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (Date.now() - start > maxTime * 1000) {
        return reject(new Error('Poll timeout'));
      }
      callApi(provider, service, version, queryAction, { JobId: jobId }, token)
        .then(result => {
          const status = result.Status || result.JobStatusCode;
          console.log(`  Job ${jobId}: status=${status}`);
          if (status === 'DONE' || status === 5) {
            resolve(result);
          } else if (status === 'FAIL' || status === 4) {
            reject(new Error(result.ErrorMessage || 'Generation failed'));
          } else {
            setTimeout(check, interval * 1000);
          }
        })
        .catch(reject);
    };
    check();
  });
}

async function generateImage(prompt, token) {
  const cfg = PROVIDERS.image;
  const provider = cfg.provider;
  const service = cfg.service;
  const version = cfg.version;
  const submitAction = cfg.submitAction;
  const queryAction = cfg.queryAction;

  console.log(`Generating: "${prompt.substring(0, 60)}..."`);
  const submitResult = await callApi(provider, service, version, submitAction, { Prompt: prompt }, token);
  const jobId = submitResult.JobId;
  console.log(`  Job submitted: ${jobId}`);

  const result = await pollJob(provider, service, version, queryAction, jobId, token);
  const url = result.ResultImage || result.ResultImageUrl || result.ResultUrl;
  return url;
}

function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const proto = u.protocol === 'https:' ? https : https;
    const opts = { hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'Mozilla/5.0' } };
    proto.get(opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, filePath).then(resolve, reject);
      }
      const file = fs.createWriteStream(filePath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

// ===== Main =====
if (!TOKEN) {
  console.error('Error: BUDDY_CLOUD_TOKEN not set');
  process.exit(1);
}

const logos = [
  { name: 'network-speed-test', prompt: 'App icon for a network speed test app, minimalist flat design, blue gradient background with a stylized speedometer needle and WiFi signal arcs, rounded square shape, clean modern iOS-style icon, no text' },
  { name: 'fangtang-trial', prompt: 'App icon for a casual game trial platform called Fangtang, minimalist flat design, orange warm gradient background with a cute candy-shaped play button, rounded square shape, playful and fun iOS-style icon, no text' },
  { name: 'recipe-cookbook', prompt: 'App icon for a recipe cookbook app, minimalist flat design, warm red gradient background with a stylized chef hat and a spoon crossing, rounded square shape, appetizing and clean iOS-style icon, no text' },
  { name: 'happy-quiz', prompt: 'App icon for a trivia quiz game app, minimalist flat design, purple gradient background with a stylized lightbulb and question mark combined, rounded square shape, smart and fun iOS-style icon, no text' },
];

for (const logo of logos) {
  try {
    const url = await generateImage(logo.prompt, TOKEN);
    console.log(`  Result: ${url}`);
    const filePath = path.join(imgDir, `${logo.name}.png`);
    await downloadFile(url, filePath);
    console.log(`  Saved: ${filePath}`);
  } catch (e) {
    console.error(`  Failed: ${e.message}`);
  }
}
