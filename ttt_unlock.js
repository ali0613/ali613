/**
 * 汤头条视频解锁脚本 for QuantumultX
 * 
 * 功能：解锁会员视频和金币视频
 * 原理：通过动态加载 CryptoJS 库，将 preview_video (试看链接) 替换为 source_origin (完整链接)
 [rewrite_local]
 ^https://api\d*\.armbmmk\.xyz/pwa\.php/api/MvDetail/detail url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/ttt_unlock.js
 * 
 [mitm]
 hostname = api*.armbmmk.xyz, *.armbmmk.xyz
 */

// AES-CFB-256 加解密参数
const AES_KEY_STR = '7205a6c3883caf95b52db5b534e12ec3';
const AES_IV_STR = '81d7beac44a86f43';
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
 * AES-CFB-256 解密
 */
function aesDecrypt(hexData) {
    try {
        const ciphertext = CryptoJS.enc.Hex.parse(hexData);
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            g_parsedKey,
            {
                iv: g_parsedIv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        );
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.log('[汤头条] 解密异常');
        return null;
    }
}

/**
 * AES-CFB-256 加密
 */
function aesEncrypt(plainText) {
    try {
        const encrypted = CryptoJS.AES.encrypt(
            plainText,
            g_parsedKey,
            {
                iv: g_parsedIv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        );
        return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
    } catch (e) {
        console.log('[汤头条] 加密异常');
        return null;
    }
}

/**
 * 处理单个视频对象解锁
 */
function processVideoItem(item) {
    if (!item || typeof item !== 'object') return;
    if (!item.preview_video) return;

    try {
        let url = item.preview_video;

        // 1. 替换域名为 long.rpuosv.cn
        url = url.replace(/^https?:\/\/[^\/]+/, 'https://long.rpuosv.cn');

        // 2. 移除 seconds 参数
        if (url.includes('?')) {
            let [base, query] = url.split('?');
            let params = query.split('&').filter(p => !p.startsWith('seconds='));
            url = base;
            if (params.length > 0) {
                url += '?' + params.join('&');
            }
        }

        // 3. 应用新链接
        item.preview_video = url;
        item.source_origin = url; // 同步给完整源

        // 同步修改其他清晰度
        if (item.source_240) item.source_240 = url;
        if (item.source_480) item.source_480 = url;
        if (item.source_720) item.source_720 = url;
        if (item.source_1080) item.source_1080 = url;

        // 4. 修改状态
        item.is_pay = true;
        item.isfree = 1;
        item.coins = 0;

        if (item.preview_tip) item.preview_tip = '已解锁';
        if (item.discount) item.discount = 0;
        if (item.origin_coins) item.origin_coins = 0;

    } catch (e) {
        console.log('[汤头条] URL 处理异常');
    }
}

/**
 * 核心处理逻辑
 */
function processBody(body) {
    try {
        // 尝试初始化环境
        if (!initCryptoEnv()) {
            console.log('[汤头条] CryptoJS 环境初始化失败');
            return body;
        }

        let jsonBody = JSON.parse(body);
        let dataToProcess = null;
        let isEncrypted = false;

        // 1. 解析数据
        if (jsonBody.data && typeof jsonBody.data === 'string' && /^[A-Fa-f0-9]+$/.test(jsonBody.data)) {
            const decryptedStr = aesDecrypt(jsonBody.data);
            if (!decryptedStr) return body;
            dataToProcess = JSON.parse(decryptedStr);
            isEncrypted = true;
        } else if (jsonBody.data && typeof jsonBody.data === 'object') {
            dataToProcess = jsonBody.data;
        } else {
            return body;
        }

        // 2. 定位并处理 detail
        if (dataToProcess) {
            let detailObj = null;
            if (dataToProcess.detail) {
                detailObj = dataToProcess.detail;
            } else if (dataToProcess.data && dataToProcess.data.detail) {
                detailObj = dataToProcess.data.detail;
            }

            if (detailObj && typeof detailObj === 'object') {
                if (Array.isArray(detailObj)) {
                    if (detailObj.length > 0) processVideoItem(detailObj[0]);
                } else {
                    processVideoItem(detailObj);
                }
            }
        }

        // 3. 重新封装/加密
        if (isEncrypted) {
            const encryptedData = aesEncrypt(JSON.stringify(dataToProcess));
            if (encryptedData) jsonBody.data = encryptedData;
        } else {
            jsonBody.data = dataToProcess;
        }

        return JSON.stringify(jsonBody);

    } catch (e) {
        console.log('[汤头条] 逻辑处理异常:' + e.message);
        return body;
    }
}

/**
 * 动态加载 CryptoJS 并执行
 */
function loadCryptoJSAndRun() {
    // 1. 检查全局环境
    if (typeof CryptoJS !== 'undefined') {
        runScript();
        return;
    }

    // 2. 检查本地缓存
    const cachedLib = $prefs.valueForKey(CACHE_KEY);
    if (cachedLib && cachedLib.length > 1000) {
        // console.log('[汤头条] 使用缓存加载 CryptoJS');
        try {
            eval(cachedLib);
            if (typeof CryptoJS !== 'undefined') {
                runScript();
                return;
            }
        } catch (e) {
            console.log('[汤头条] 缓存库损坏，尝试重新下载');
            $prefs.removeValueForKey(CACHE_KEY);
        }
    }

    // 3. 下载库
    console.log('[汤头条] 下载 CryptoJS...');
    $task.fetch({ url: CRYPTO_JS_URL }).then(response => {
        if (response.statusCode === 200) {
            try {
                eval(response.body);
                // 写入缓存
                $prefs.setValueForKey(response.body, CACHE_KEY);
                console.log('[汤头条] 库下载成功并缓存');
                runScript();
            } catch (e) {
                console.log('[汤头条] 库执行失败');
                $done({});
            }
        } else {
            console.log('[汤头条] 库下载失败:' + response.statusCode);
            $done({});
        }
    }, reason => {
        console.log('[汤头条] 网络请求失败');
        $done({});
    });
}

/**
 * 实际运行脚本
 */
function runScript() {
    const response = $response;
    if (!response || !response.body) {
        $done({});
        return;
    }
    const modifiedBody = processBody(response.body);
    $done({ body: modifiedBody });
}

// 启动
loadCryptoJSAndRun();
