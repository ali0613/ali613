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
 * 处理单个视频对象解锁
 */
function processVideoItem(item) {
    if (!item || typeof item !== 'object') return;

    // 检查是否有必要的字段
    // 至少要有 source_origin 或 source_240
    if (!item.source_origin && !item.source_240) return;

    console.log(`[汤头条] 处理视频: ${item.title || item.id || '未知'}`);

    let targetUrl = '';
    const src240 = item.source_240 || '';

    // 逻辑判断
    // 1. 如果 source_240 链接中包含 "play"，则使用 source_origin
    if (src240.includes('play')) {
        console.log('[汤头条] 匹配到 play，使用 source_origin');
        targetUrl = item.source_origin;
    }
    // 2. 如果 source_240 包含 "videos5"，则使用 source_240
    else if (src240.includes('videos5')) {
        console.log('[汤头条] 匹配到 videos5，使用 source_240');
        targetUrl = src240;
    }
    // 3. 默认回退：如果有 source_origin 则用它，否则用 source_240
    else {
        console.log('[汤头条] 未匹配特定规则，默认使用 source_origin');
        targetUrl = item.source_origin || item.source_240;
    }

    if (targetUrl) {
        // 执行替换
        item.preview_video = targetUrl;

        // 标记信息
        item.is_pay = true;
        item.isfree = 1;
        item.coins = 0;

        // 同步修改其他清晰度（可选，保持一致）
        if (item.source_240) item.source_240 = targetUrl;
        if (item.source_480) item.source_480 = targetUrl;
        if (item.source_720) item.source_720 = targetUrl;
        if (item.source_1080) item.source_1080 = targetUrl;

        if (item.preview_tip) item.preview_tip = '已解锁完整版';
        if (item.discount) item.discount = 0;
        if (item.origin_coins) item.origin_coins = 0;

        console.log('[汤头条] 解锁完成');
    }
}

/**
 * 核心处理逻辑
 */
function processBody(body) {
    try {
        let jsonBody = JSON.parse(body);
        let dataToProcess = null;
        let isEncrypted = false;

        // 1. 解析数据
        if (jsonBody.data && typeof jsonBody.data === 'string' && /^[A-Fa-f0-9]+$/.test(jsonBody.data)) {
            console.log('[汤头条] 检测到加密响应');
            const decryptedStr = aesDecrypt(jsonBody.data);
            if (!decryptedStr) return body;

            dataToProcess = JSON.parse(decryptedStr);
            isEncrypted = true;
        } else if (jsonBody.data && typeof jsonBody.data === 'object') {
            console.log('[汤头条] 检测到未加密响应');
            dataToProcess = jsonBody.data;
        } else {
            return body;
        }

        // 2. 定位并处理 detail
        if (dataToProcess) {
            // 只处理 data.detail
            if (dataToProcess.detail && typeof dataToProcess.detail === 'object') {
                // 如果 detail 是数组（虽然通常是对象），取第一个；如果是对象，直接处理
                if (Array.isArray(dataToProcess.detail)) {
                    if (dataToProcess.detail.length > 0) {
                        processVideoItem(dataToProcess.detail[0]);
                    }
                } else {
                    processVideoItem(dataToProcess.detail);
                }
            } else {
                console.log('[汤头条] 未找到 detail 字段，跳过处理');
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
