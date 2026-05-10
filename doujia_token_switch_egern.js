/*
 * 兜夹免费抓取账号 Token 自动切换 - Egern
 *
 * 用途：
 * 1. 在 Egern 小组件/通用脚本中执行：随机检查账号，找到 free_times > 0 的账号后保存 access-token。
 * 2. 通过 Egern 模块拦截 userapi.cczhua.com 请求，自动添加/替换 access-token。
 * 3. 当天已经检查过的账号会记录，避免当天重复检查。
 *
 * 文件：
 * - doujia_token_switch_egern.yaml      Egern 原生模块
 * - doujia_token_switch_egern.sgmodule  Egern 模块
 * - doujia_token_switch_egern.js        Egern 脚本
 *
 * 账号模块参数：
 * - 参数名：accounts
 * - 推荐多账号格式：13800138000#password|13900139000#password
 * - 也支持 URL 编码后的 JSON 数组。
 *
 * 使用方式：
 * - 将本脚本与模块放在 Egern 可访问的位置；如果通过远程订阅导入模块，请把模块里的脚本路径改成脚本真实 URL。
 * - 在 Egern 模块参数 accounts 中配置账号，脚本只读取模块参数，不读取环境变量/持久化账密。
 * - 在 Egern 中启用模块，并允许 MITM userapi.cczhua.com。
 * - 在 Egern 小组件/通用脚本中执行“兜夹 Token 切换小组件”，提示“已替换 Token”后再打开兜夹。
 */

// ==================== 模块参数配置区 ====================
// 请在 Egern 模块参数 accounts 中配置账号，脚本内不保存账密。
// 支持格式：
// 1) 推荐多账号：13800138000#password|13900139000#password
// 2) URL 编码后的 JSON 数组：%5B%7B%22phone%22%3A%2213800138000%22%2C%22password%22%3A%22password%22%7D%5D
// 3) JSON 对象/多行文本也可解析，但远程模块参数中建议 URL 编码。
const ACCOUNTS_ENV_KEY = 'DOUJIA_ACCOUNTS';
// ==================== 配置区结束 ====================

const SCRIPT_NAME = '兜夹Token切换';
const API_BASE = 'https://userapi.cczhua.com';
const TOKEN_STORE_KEY = 'doujia_current_access_token';
const TOKEN_ACCOUNT_STORE_KEY = 'doujia_current_token_account';
const TOKEN_FREE_TIMES_STORE_KEY = 'doujia_current_token_free_times';
const TOKEN_UPDATED_AT_STORE_KEY = 'doujia_current_token_updated_at';
const USED_DATE_KEY = 'doujia_token_used_date';
const USED_ACCOUNTS_KEY = 'doujia_token_used_accounts_today';

const COMMON_HEADERS = {
  accept: '*/*',
  'content-type': 'application/json',
  'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Html5Plus/1.0 (Immersed/20) uni-app',
  'accept-language': 'zh-CN,zh-Hans;q=0.9',
};

const isRequestScript = typeof $request !== 'undefined' && $request && $request.url;

function log(message) {
  console.log(`[${SCRIPT_NAME}] ${message}`);
}

function notify(title, subtitle, message) {
  if (typeof $notification !== 'undefined' && $notification && typeof $notification.post === 'function') {
    $notification.post(title, subtitle || '', message || '');
    return;
  }
  if (typeof $notify === 'function') {
    $notify(title, subtitle || '', message || '');
  }
}

function readStore(key) {
  if (typeof $persistentStore !== 'undefined' && $persistentStore && typeof $persistentStore.read === 'function') {
    return $persistentStore.read(key);
  }
  if (typeof $prefs !== 'undefined' && $prefs && typeof $prefs.valueForKey === 'function') {
    return $prefs.valueForKey(key);
  }
  return null;
}

function writeStore(key, value) {
  const text = value === undefined || value === null ? '' : String(value);
  if (typeof $persistentStore !== 'undefined' && $persistentStore && typeof $persistentStore.write === 'function') {
    return $persistentStore.write(text, key);
  }
  if (typeof $prefs !== 'undefined' && $prefs && typeof $prefs.setValueForKey === 'function') {
    return $prefs.setValueForKey(text, key);
  }
  return false;
}

function getModuleArgumentValue(key) {
  // 只从模块参数/脚本参数读取账号，避免不同入口的环境变量行为不一致。
  // 推荐模块参数：accounts=手机号#密码|手机号#密码
  // 实际传给脚本：DOUJIA_ACCOUNTS={{{accounts}}}
  if (typeof $argument !== 'undefined' && $argument !== null) {
    const argumentText = String($argument).trim();
    if (argumentText) {
      const matched = argumentText.match(new RegExp(`(?:^|[&;\\n])${key}=([\\s\\S]*?)(?:[&;\\n][A-Za-z0-9_-]+=|$)`, 'i'));
      if (matched && matched[1]) {
        const value = decodeText(String(matched[1]).trim());
        if (value && value !== '#') {
          return value;
        }
      } else if (!/[&=]/.test(argumentText) && argumentText !== '#') {
        // 兼容直接把账号文本作为脚本参数的情况。
        const looksLikeJsonAccounts = /^\s*[\[{]/.test(argumentText);
        const looksLikeMultilineAccounts = /\n/.test(argumentText);
        const looksLikeTextAccounts = /[#|,]/.test(argumentText);
        if (looksLikeJsonAccounts || looksLikeMultilineAccounts || looksLikeTextAccounts) {
          return decodeText(argumentText);
        }
      }
    }
  }

  return '';
}

function decodeText(text) {
  let value = String(text || '').trim();
  if (!value) return '';
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch (e) {
      break;
    }
  }
  return value.trim();
}

function normalizeAccount(item) {
  if (!item) return null;
  const phone = item.phone || item.phone_number || item.mobile || item.account || item.username || item.user;
  const password = item.password || item.user_password || item.pass || item.pwd;
  if (!phone || !password) return null;
  return {
    phone: String(phone).trim(),
    password: String(password).trim(),
  };
}

function parseAccountsFromJson(raw) {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed.map(normalizeAccount).filter(Boolean);
  }
  if (parsed && typeof parsed === 'object') {
    return Object.keys(parsed).map((phone) => normalizeAccount({ phone, password: parsed[phone] })).filter(Boolean);
  }
  return [];
}

function parseAccountsFromText(raw) {
  const text = decodeText(raw);
  const normalized = normalizeAccountText(text);

  return normalized
    .split(/[\n;]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // 忽略小组件/脚本控制参数，避免 panel/icon 等被当作账号。
      if (/^(panel|icon|icon-color|iconColor|color|title|content|message)=/i.test(line)) {
        return null;
      }
      const separator = ['#', '=', ','].find((item) => line.includes(item)) || (line.indexOf('|') === line.lastIndexOf('|') ? '|' : '');
      if (!separator) return null;
      const index = line.indexOf(separator);
      return normalizeAccount({
        phone: line.slice(0, index),
        password: line.slice(index + 1),
      });
    })
    .filter(Boolean);
}

function normalizeAccountText(text) {
  const source = String(text || '').trim();
  if (!source) return '';

  // 推荐格式：手机号#密码|手机号#密码。
  // 当文本中出现多个“账号#密码”片段时，优先把片段之间的 | 视为账号分隔符，避免只读取到第一个账号。
  if ((source.match(/[^#|=,;\n\s]+#[^#|=,;\n\s]+/g) || []).length > 1) {
    return source.replace(/\|(?=[^#|=,;\n\s]+#)/g, '\n');
  }

  return source;
}

function getAccountsFromModuleArgument() {
  const raw = getModuleArgumentValue(ACCOUNTS_ENV_KEY).trim();
  if (!raw) return [];

  let accounts = [];
  try {
    accounts = parseAccountsFromJson(raw);
  } catch (e) {
    accounts = parseAccountsFromText(raw);
  }

  const seen = {};
  return accounts.filter((item) => {
    if (!item.phone || !item.password || seen[item.phone]) return false;
    seen[item.phone] = true;
    return true;
  });
}

function finish(value) {
  if (typeof $done === 'function') {
    $done(value || {});
  }
}

function finishWidget(status) {
  const title = status && status.title ? status.title : SCRIPT_NAME;
  const subtitle = status && status.subtitle ? status.subtitle : '';
  const message = status && status.message ? status.message : '';
  const ok = Boolean(status && status.ok);
  const color = ok ? '#18a058' : '#d03050';
  const icon = ok ? 'checkmark.seal.fill' : 'exclamationmark.triangle.fill';

  // Egern 小组件/通用脚本通常会读取 title/content/icon/color；同时保留多字段以兼容不同展示入口。
  finish({
    title,
    subtitle,
    content: message,
    message,
    icon,
    color,
    iconColor: color,
    'icon-color': color,
  });
}

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nowString() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${todayString()} ${hh}:${mm}:${ss}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const text = String(phone);
  if (text.length <= 7) return text;
  return `${text.slice(0, 3)}****${text.slice(-4)}`;
}

function getTodayUsedAccounts() {
  const today = todayString();
  const savedDate = readStore(USED_DATE_KEY);
  if (savedDate !== today) {
    writeStore(USED_DATE_KEY, today);
    writeStore(USED_ACCOUNTS_KEY, '[]');
    return [];
  }

  try {
    const raw = readStore(USED_ACCOUNTS_KEY) || '[]';
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveTodayUsedAccount(phone) {
  const today = todayString();
  const used = getTodayUsedAccounts();
  if (!used.includes(phone)) used.push(phone);
  writeStore(USED_DATE_KEY, today);
  writeStore(USED_ACCOUNTS_KEY, JSON.stringify(used));
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function parseJsonBody(body) {
  if (!body) return {};
  if (typeof body === 'object') return body;
  return JSON.parse(body);
}

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const req = {
      url,
      method,
      headers: headers || {},
    };
    if (body !== undefined && body !== null) {
      req.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const handler = (error, response, responseBody) => {
      if (error) {
        reject(new Error(error && error.message ? error.message : String(error)));
        return;
      }
      try {
        const rawBody = responseBody !== undefined ? responseBody : response && response.body;
        const data = parseJsonBody(rawBody);
        resolve({ response: response || {}, data });
      } catch (e) {
        reject(new Error(`响应解析失败: ${e.message || e}`));
      }
    };

    if (typeof $httpClient !== 'undefined' && $httpClient) {
      const clientMethod = String(method).toLowerCase() === 'get' ? 'get' : 'post';
      $httpClient[clientMethod](req, handler);
      return;
    }

    if (typeof $task !== 'undefined' && $task && typeof $task.fetch === 'function') {
      $task.fetch(req).then((resp) => handler(null, resp, resp.body), (err) => handler(err));
      return;
    }

    reject(new Error('当前环境不支持 $httpClient/$task 网络请求'));
  });
}

async function login(account) {
  const url = `${API_BASE}/v1/userLogin/password`;
  const body = {
    login_device: 'IOS',
    phone_number: account.phone,
    user_password: account.password,
  };
  const result = await request('POST', url, COMMON_HEADERS, body);
  const data = result.data;
  if (data.code !== 200) {
    throw new Error(data.message || '登录失败');
  }

  const token = data.data && data.data.token && data.data.token.access_token;
  if (!token) {
    throw new Error('登录成功但未返回 access_token');
  }
  return token;
}

async function queryFreeTimes(accessToken) {
  const url = `${API_BASE}/v2/device/13?product_id=21`;
  const headers = Object.assign({}, COMMON_HEADERS, {
    origin: 'https://m.cczhua.com',
    referer: 'https://m.cczhua.com/',
    'access-token': accessToken,
  });
  delete headers['content-type'];

  const result = await request('GET', url, headers, null);
  const data = result.data;
  if (data.code !== 200) {
    throw new Error(data.message || '查询免费次数失败');
  }

  return data.data && typeof data.data.free_times === 'number' ? data.data.free_times : 0;
}

function saveCurrentToken(phone, token, freeTimes) {
  writeStore(TOKEN_STORE_KEY, token);
  writeStore(TOKEN_ACCOUNT_STORE_KEY, phone);
  writeStore(TOKEN_FREE_TIMES_STORE_KEY, String(freeTimes));
  writeStore(TOKEN_UPDATED_AT_STORE_KEY, nowString());
  saveTodayUsedAccount(phone);
}

async function chooseAndSaveToken() {
  const accounts = getAccountsFromModuleArgument();
  if (!accounts.length) {
    const status = {
      ok: false,
      title: SCRIPT_NAME,
      subtitle: '未配置账号模块参数',
      message: '请在 Egern 模块参数 accounts 中配置账号\n推荐格式：手机号#密码|手机号#密码',
    };
    notify(status.title, status.subtitle, status.message);
    finishWidget(status);
    return;
  }

  const used = getTodayUsedAccounts();
  const candidates = shuffle(accounts.filter((item) => !used.includes(item.phone)));

  if (!candidates.length) {
    const status = {
      ok: false,
      title: SCRIPT_NAME,
      subtitle: '无可用账号',
      message: '今日配置账号均已检查/使用过，可明天再试或清空 used 记录',
    };
    notify(status.title, status.subtitle, status.message);
    finishWidget(status);
    return;
  }

  let checkedCount = 0;
  for (const account of candidates) {
    const showPhone = maskPhone(account.phone);
    try {
      checkedCount += 1;
      log(`[${showPhone}] 开始登录`);
      const token = await login(account);
      log(`[${showPhone}] 登录成功，查询免费次数`);
      const freeTimes = await queryFreeTimes(token);
      log(`[${showPhone}] 免费次数: ${freeTimes}`);

      // 已检查账号均记录为今日已尝试，避免当天重复检查。
      saveTodayUsedAccount(account.phone);

      if (freeTimes > 0) {
        saveCurrentToken(account.phone, token, freeTimes);
        const status = {
          ok: true,
          title: SCRIPT_NAME,
          subtitle: '已替换 Token',
          message: `账号：${showPhone}\n免费次数：${freeTimes}\n检查数量：${checkedCount}/${candidates.length}\n更新时间：${nowString()}`,
        };
        notify(status.title, status.subtitle, status.message);
        finishWidget(status);
        return;
      }
    } catch (e) {
      const msg = e.message || String(e);
      log(`[${showPhone}] 失败: ${msg}`);
    }
  }

  const status = {
    ok: false,
    title: SCRIPT_NAME,
    subtitle: '无可用账号',
    message: `已检查 ${checkedCount} 个账号，没有找到免费次数大于 0 的账号`,
  };
  notify(status.title, status.subtitle, status.message);
  finishWidget(status);
}

function deleteHeaderCaseInsensitive(headers, name) {
  Object.keys(headers).forEach((key) => {
    if (key.toLowerCase() === name.toLowerCase()) {
      delete headers[key];
    }
  });
}

function rewriteRequestHeader() {
  const token = readStore(TOKEN_STORE_KEY);
  if (!token) {
    finish({});
    return;
  }

  const req = $request;
  const headers = Object.assign({}, req.headers || {});
  deleteHeaderCaseInsensitive(headers, 'access-token');
  headers['access-token'] = token;

  finish({
    url: req.url,
    method: req.method,
    headers,
    body: req.body,
  });
}

if (isRequestScript) {
  rewriteRequestHeader();
} else {
  chooseAndSaveToken().catch((e) => {
    const status = {
      ok: false,
      title: SCRIPT_NAME,
      subtitle: '脚本异常',
      message: e.message || String(e),
    };
    notify(status.title, status.subtitle, status.message);
    finishWidget(status);
  });
}
