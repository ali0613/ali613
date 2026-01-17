/**
 * 购买接口修改脚本 for QuantumultX
 * 
 * 功能：修改购买请求中的 money 为 0
 * 原理：动态加载 CryptoJS 库，解密/加密请求体中的 data 字段
 * 
 [rewrite_local]
 ^http://104\.233\.223\.2:7781/api/buy url script-request-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/chxb.js
 * 
 [mitm]
 hostname = 104.233.223.2
 */

// AES-CBC-PKCS7 加解密参数
const AES_KEY_STR = 'GftZqNEoBVdB2kwx';
const AES_IV_STR = '3zyJFPEzh5rUeUNi';
const CRYPTO_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
const CACHE_KEY = 'ttt_cryptojs_cache_v1'; // 缓存键名

// 全局变量存储预解析的 Key/IV
let g_parsedKey = null;
let g_parsedIv = null;

/**
 * 初始化加密环境
 */
function initCryptoEnv() {
    if (typeof CryptoJS === 'undefined') return false;
    if (!g_parsedKey) {
        g_parsedKey = CryptoJS.enc.Utf8.parse(AES_KEY_STR);
        g_parsedIv = CryptoJS.enc.Utf8.parse(AES_IV_STR);
    }
    return true;
}

/**
 * AES-CBC-PKCS7 解密
 */
function aesDecrypt(base64Data) {
    try {
        const ciphertext = CryptoJS.enc.Base64.parse(base64Data);
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            g_parsedKey,
            {
                iv: g_parsedIv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.log('[购买修改] 解密异常: ' + e.message);
        return null;
    }
}

/**
 * AES-CBC-PKCS7 加密
 */
function aesEncrypt(plainText) {
    try {
        const encrypted = CryptoJS.AES.encrypt(
            plainText,
            g_parsedKey,
            {
                iv: g_parsedIv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        return encrypted.toString();
    } catch (e) {
        console.log('[购买修改] 加密异常: ' + e.message);
        return null;
    }
}

/**
 * 处理请求体
 */
function processBody(body) {
    try {
        // 尝试初始化环境
        if (!initCryptoEnv()) {
            console.log('[购买修改] CryptoJS 环境初始化失败');
            return body;
        }

        // 解析请求体
        let jsonBody = JSON.parse(body);
        
        // 检查是否有 data 字段
        if (!jsonBody.data || typeof jsonBody.data !== 'string') {
            console.log('[购买修改] 请求体中没有 data 字段');
            return body;
        }

        console.log('[购买修改] 原始 data 长度: ' + jsonBody.data.length);

        // 解密 data 字段
        const decryptedStr = aesDecrypt(jsonBody.data);
        if (!decryptedStr) {
            console.log('[购买修改] 解密失败');
            return body;
        }

        console.log('[购买修改] 解密后内容: ' + decryptedStr);

        // 解析为 JSON
        let dataObj = JSON.parse(decryptedStr);

        // 检查是否有 money 字段
        if (dataObj.hasOwnProperty('money')) {
            const originalMoney = dataObj.money;
            dataObj.money = 0;
            console.log('[购买修改] money 已修改: ' + originalMoney + ' -> 0');
        } else {
            console.log('[购买修改] 数据中没有 money 字段');
        }

        // 重新序列化为紧凑 JSON（移除空格）
        const newDataStr = JSON.stringify(dataObj).replace(/\s+/g, '');

        console.log('[购买修改] 修改后 JSON: ' + newDataStr);

        // 重新加密
        const encryptedData = aesEncrypt(newDataStr);
        if (!encryptedData) {
            console.log('[购买修改] 加密失败');
            return body;
        }

        // 更新请求体
        jsonBody.data = encryptedData;

        const newBody = JSON.stringify(jsonBody);
        console.log('[购买修改] 新请求体: ' + newBody);

        return newBody;

    } catch (e) {
        console.log('[购买修改] 逻辑处理异常: ' + e.message);
        console.log('[购买修改] 异常堆栈: ' + e.stack);
        return body;
    }
}

/**
 * 动态加载 CryptoJS 并执行
 */
function loadCryptoJSAndRun() {
    // 1. 检查全局环境
    if (typeof CryptoJS !== 'undefined') {
        console.log('[购买修改] CryptoJS 已存在，直接执行');
        runScript();
        return;
    }

    // 2. 检查本地缓存
    const cachedLib = $prefs.valueForKey(CACHE_KEY);
    if (cachedLib && cachedLib.length > 1000) {
        console.log('[购买修改] 使用缓存加载 CryptoJS');
        try {
            eval(cachedLib);
            if (typeof CryptoJS !== 'undefined') {
                runScript();
                return;
            }
        } catch (e) {
            console.log('[购买修改] 缓存库损坏，尝试重新下载: ' + e.message);
            $prefs.removeValueForKey(CACHE_KEY);
        }
    }

    // 3. 下载库
    console.log('[购买修改] 下载 CryptoJS...');
    $task.fetch({ url: CRYPTO_JS_URL }).then(response => {
        if (response.statusCode === 200) {
            try {
                eval(response.body);
                // 写入缓存
                $prefs.setValueForKey(response.body, CACHE_KEY);
                console.log('[购买修改] 库下载成功并缓存，大小: ' + response.body.length);
                runScript();
            } catch (e) {
                console.log('[购买修改] 库执行失败: ' + e.message);
                $done({});
            }
        } else {
            console.log('[购买修改] 库下载失败，状态码: ' + response.statusCode);
            $done({});
        }
    }, reason => {
        console.log('[购买修改] 网络请求失败: ' + reason);
        $done({});
    });
}

/**
 * 实际运行脚本
 */
function runScript() {
    const request = $request;
    if (!request || !request.body) {
        console.log('[购买修改] 没有请求体');
        $done({});
        return;
    }
    
    console.log('[购买修改] 开始处理请求...');
    const modifiedBody = processBody(request.body);
    $done({ body: modifiedBody });
}

// 启动
loadCryptoJSAndRun();
