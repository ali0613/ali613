/**
 * 汤头条视频解锁脚本 for QuantumultX
 * 
 * 功能：解锁会员视频和金币视频
 * 原理：通过动态加载 CryptoJS 库，将 preview_video (试看链接) 替换为 source_origin (完整链接)
 * 
 [rewrite_local]
 ^https://api\d*\.armbmmk\.xyz/pwa\.php/api/MvDetail/detail url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/tangtoutiao_unlock.js
 * 
 [mitm]
 hostname = api*.armbmmk.xyz, *.armbmmk.xyz
 */

// AES-CFB-256 加解密参数
// 注意：AES-256 需要 32 字节密钥。
// "7205a6c3883caf95b52db5b534e12ec3" 是 32 个字符。
// 如果作为 Hex 解析只有 16 字节 (AES-128)。
// 如果作为 UTF8 字符串解析则是 32 字节 (AES-256)。
// 根据 "AES-CFB-256" 的描述，这里应该使用 UTF8 解析。
// 同理 IV "81d7beac44a86f43" 是 16 个字符，作为 UTF8 解析为 16 字节 (128 bits)，符合 AES block size。
const AES_KEY_STR = '7205a6c3883caf95b52db5b534e12ec3';
const AES_IV_STR = '81d7beac44a86f43';
const CRYPTO_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';

/**
 * AES-CFB-256 解密
 */
function aesDecrypt(hexData) {
    try {
        // 使用 Utf8 解析 Key 以获得 32 字节 (256 bits)
        const key = CryptoJS.enc.Utf8.parse(AES_KEY_STR);
        const iv = CryptoJS.enc.Utf8.parse(AES_IV_STR);
        const ciphertext = CryptoJS.enc.Hex.parse(hexData);

        console.log(`[汤头条] Key字节数: ${key.sigBytes}, IV字节数: ${iv.sigBytes}`);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        );

        const result = decrypted.toString(CryptoJS.enc.Utf8);
        if (!result) {
            console.log('[汤头条] 解密结果为空，可能是密钥错误或算法模式不匹配');
        }
        return result;
    } catch (e) {
        console.log('[汤头条] 解密抛出异常:', e.message || e);
        return null;
    }
}

/**
 * AES-CFB-256 加密
 */
function aesEncrypt(plainText) {
    try {
        const key = CryptoJS.enc.Utf8.parse(AES_KEY_STR);
        const iv = CryptoJS.enc.Utf8.parse(AES_IV_STR);

        const encrypted = CryptoJS.AES.encrypt(
            plainText,
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        );

        return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
    } catch (e) {
        console.log('[汤头条] 加密失败:', e.message || e);
        return null;
    }
}

/**
 * 递归解锁视频对象
 */
function unlockVideoObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => unlockVideoObject(item));
    }

    if (obj.source_origin && obj.preview_video) {
        console.log(`[汤头条] 解锁视频: ${obj.title || obj.id || '未知'}`);
        // 核心解锁
        obj.preview_video = obj.source_origin;
        obj.is_pay = true;
        obj.isfree = 1;
        obj.coins = 0;

        // 替换所有清晰度源
        if (obj.source_240) obj.source_240 = obj.source_origin;
        if (obj.source_480) obj.source_480 = obj.source_origin;
        if (obj.source_720) obj.source_720 = obj.source_origin;
        if (obj.source_1080) obj.source_1080 = obj.source_origin;

        // 清除提示
        if (obj.preview_tip) obj.preview_tip = '已解锁完整版';
        if (obj.discount) obj.discount = 0;
        if (obj.origin_coins) obj.origin_coins = 0;
    }

    for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = unlockVideoObject(obj[key]);
        }
    }

    return obj;
}

/**
 * 核心处理逻辑
 */
function processBody(body) {
    try {
        let jsonBody = JSON.parse(body);

        // 加密响应
        if (jsonBody.data && typeof jsonBody.data === 'string' && /^[A-Fa-f0-9]+$/.test(jsonBody.data)) {
            console.log('[汤头条] 检测到加密响应');
            const decryptedStr = aesDecrypt(jsonBody.data);
            if (!decryptedStr) return body;

            let decryptedData = JSON.parse(decryptedStr);
            console.log('[汤头条] 解密成功，执行解锁...');
            decryptedData = unlockVideoObject(decryptedData);

            const encryptedData = aesEncrypt(JSON.stringify(decryptedData));
            if (encryptedData) jsonBody.data = encryptedData;

            return JSON.stringify(jsonBody);
        }

        // 未加密响应
        if (jsonBody.data && typeof jsonBody.data === 'object') {
            console.log('[汤头条] 检测到未加密响应');
            jsonBody.data = unlockVideoObject(jsonBody.data);
            return JSON.stringify(jsonBody);
        }

        return body;
    } catch (e) {
        console.log('[汤头条] 处理失败:', e);
        return body;
    }
}

/**
 * 动态加载 CryptoJS 并执行
 */
function loadCryptoJSAndRun() {
    // 如果已经存在 CryptoJS，直接运行
    if (typeof CryptoJS !== 'undefined') {
        runScript();
        return;
    }

    console.log('[汤头条] 正在加载 CryptoJS...');
    const request = {
        url: CRYPTO_JS_URL,
        method: 'GET'
    };

    $task.fetch(request).then(response => {
        if (response.statusCode === 200) {
            try {
                // 执行加载的库代码
                eval(response.body);
                console.log('[汤头条] CryptoJS 加载成功');
                runScript();
            } catch (e) {
                console.log('[汤头条] CryptoJS 执行失败:', e);
                $done({});
            }
        } else {
            console.log('[汤头条] CryptoJS 下载失败，状态码:', response.statusCode);
            $done({});
        }
    }, reason => {
        console.log('[汤头条] CryptoJS 请求失败:', reason.error);
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
