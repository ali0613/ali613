/**
 * 汤头条视频解锁脚本 for QuantumultX
 * 
 * 功能：解锁会员视频和金币视频
 * 原理：将 preview_video (试看链接) 替换为 source_origin (完整链接)
 * 
 * ===================== QuantumultX 配置 =====================
 * 
 [rewrite_local]
 ^https://api\d*\.armbmmk\.xyz/pwa\.php/api/MvDetail/detail url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/tangtoutiao_unlock.js
 * 
 [mitm]
 hostname = api*.armbmmk.xyz, *.armbmmk.xyz
 * 
 * ===================== 或使用远程订阅 =====================
 * 
 * 将以下内容保存为 tangtoutiao.conf 远程订阅：
 * 
 * [rewrite_local]
 * ^https://api\d*\.armbmmk\.xyz/pwa\.php/api/MvDetail/detail url script-response-body tangtoutiao_unlock.js
 * 
 * [mitm]
 * hostname = api*.armbmmk.xyz, *.armbmmk.xyz
 * 
 * ============================================================
 */

// AES-CFB-256 加解密参数
const AES_KEY_HEX = '7205a6c3883caf95b52db5b534e12ec3';
const AES_IV_STR = '81d7beac44a86f43';

/**
 * 十六进制字符串转字节数组
 */
function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

/**
 * 字节数组转十六进制字符串
 */
function bytesToHex(bytes) {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * 字符串转字节数组
 */
function strToBytes(str) {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str));
}

/**
 * 字节数组转字符串
 */
function bytesToStr(bytes) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(new Uint8Array(bytes));
}

/**
 * AES-CFB-256 解密
 * 支持 QuantumultX 的多种加密库环境
 */
function aesDecrypt(hexData) {
    try {
        // 尝试使用 $crypto (QuantumultX 原生)
        if (typeof $crypto !== 'undefined' && $crypto.decrypt) {
            console.log('[汤头条] 使用 $crypto 进行解密');
            const decrypted = $crypto.decrypt(hexData, 'aes-256-cfb', AES_KEY_HEX, AES_IV_STR);
            if (decrypted) {
                return decrypted;
            }
        }

        // 尝试使用 CryptoJS
        if (typeof CryptoJS !== 'undefined') {
            console.log('[汤头条] 使用 CryptoJS 进行解密');
            const key = CryptoJS.enc.Hex.parse(AES_KEY_HEX);
            const iv = CryptoJS.enc.Utf8.parse(AES_IV_STR);
            const ciphertext = CryptoJS.enc.Hex.parse(hexData);

            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: ciphertext },
                key,
                {
                    iv: iv,
                    mode: CryptoJS.mode.CFB,
                    padding: CryptoJS.pad.NoPadding
                }
            );

            return decrypted.toString(CryptoJS.enc.Utf8);
        }

        // 尝试使用 crypto-js 模块 (如果已引入)
        if (typeof require !== 'undefined') {
            try {
                console.log('[汤头条] 尝试 require crypto-js');
                const CryptoModule = require('crypto-js');
                const key = CryptoModule.enc.Hex.parse(AES_KEY_HEX);
                const iv = CryptoModule.enc.Utf8.parse(AES_IV_STR);
                const ciphertext = CryptoModule.enc.Hex.parse(hexData);

                const decrypted = CryptoModule.AES.decrypt(
                    { ciphertext: ciphertext },
                    key,
                    {
                        iv: iv,
                        mode: CryptoModule.mode.CFB,
                        padding: CryptoModule.pad.NoPadding
                    }
                );

                return decrypted.toString(CryptoModule.enc.Utf8);
            } catch (requireError) {
                console.log('[汤头条] require 失败:', requireError.message);
            }
        }

        console.log('[汤头条] 所有加密库均不可用');
        console.log('[汤头条] 环境检测: $crypto=' + (typeof $crypto) + ', CryptoJS=' + (typeof CryptoJS) + ', require=' + (typeof require));
        return null;

    } catch (e) {
        console.log('[汤头条] 解密异常:', e.message || e);
        console.log('[汤头条] 错误堆栈:', e.stack || '无');
        return null;
    }
}

/**
 * AES-CFB-256 加密
 * 支持 QuantumultX 的多种加密库环境
 */
function aesEncrypt(plainText) {
    try {
        // 尝试使用 $crypto (QuantumultX 原生)
        if (typeof $crypto !== 'undefined' && $crypto.encrypt) {
            console.log('[汤头条] 使用 $crypto 进行加密');
            const encrypted = $crypto.encrypt(plainText, 'aes-256-cfb', AES_KEY_HEX, AES_IV_STR);
            if (encrypted) {
                return encrypted.toUpperCase();
            }
        }

        // 尝试使用 CryptoJS
        if (typeof CryptoJS !== 'undefined') {
            console.log('[汤头条] 使用 CryptoJS 进行加密');
            const key = CryptoJS.enc.Hex.parse(AES_KEY_HEX);
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
        }

        // 尝试使用 crypto-js 模块
        if (typeof require !== 'undefined') {
            try {
                console.log('[汤头条] 尝试 require crypto-js');
                const CryptoModule = require('crypto-js');
                const key = CryptoModule.enc.Hex.parse(AES_KEY_HEX);
                const iv = CryptoModule.enc.Utf8.parse(AES_IV_STR);

                const encrypted = CryptoModule.AES.encrypt(
                    plainText,
                    key,
                    {
                        iv: iv,
                        mode: CryptoModule.mode.CFB,
                        padding: CryptoModule.pad.NoPadding
                    }
                );

                return encrypted.ciphertext.toString(CryptoModule.enc.Hex).toUpperCase();
            } catch (requireError) {
                console.log('[汤头条] require 失败:', requireError.message);
            }
        }

        console.log('[汤头条] 所有加密库均不可用');
        return null;

    } catch (e) {
        console.log('[汤头条] 加密异常:', e.message || e);
        console.log('[汤头条] 错误堆栈:', e.stack || '无');
        return null;
    }
}

/**
 * 递归解锁视频对象
 * 将 preview_video 替换为 source_origin
 */
function unlockVideoObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => unlockVideoObject(item));
    }

    // 检查是否为视频对象（包含 source_origin 和 preview_video）
    if (obj.source_origin && obj.preview_video) {
        console.log(`[汤头条] 解锁视频: ${obj.title || obj.id || '未知'}`);

        // 核心解锁：将试看链接替换为完整链接
        obj.preview_video = obj.source_origin;

        // 标记为已付费/免费
        obj.is_pay = true;
        obj.isfree = 1;
        obj.coins = 0;

        // 如果有多清晰度源，也替换
        if (obj.source_240) obj.source_240 = obj.source_origin;
        if (obj.source_480) obj.source_480 = obj.source_origin;
        if (obj.source_720) obj.source_720 = obj.source_origin;
        if (obj.source_1080) obj.source_1080 = obj.source_origin;

        // 清除付费提示
        if (obj.preview_tip) {
            obj.preview_tip = '';
        }

        // 清除折扣信息
        if (obj.discount) obj.discount = 0;
        if (obj.origin_coins) obj.origin_coins = 0;
    }

    // 递归处理所有嵌套对象和数组
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = unlockVideoObject(obj[key]);
        }
    }

    return obj;
}

/**
 * 处理视频详情接口响应
 */
function processDetailResponse(body) {
    try {
        let jsonBody = JSON.parse(body);

        // 情况1: 加密响应 (data 是十六进制字符串)
        if (jsonBody.data && typeof jsonBody.data === 'string' && /^[A-Fa-f0-9]+$/.test(jsonBody.data)) {
            console.log('[汤头条] 检测到加密响应，正在解密...');

            const decryptedStr = aesDecrypt(jsonBody.data);
            if (!decryptedStr) {
                console.log('[汤头条] 解密失败，返回原始响应');
                return body;
            }

            let decryptedData = JSON.parse(decryptedStr);
            console.log('[汤头条] 解密成功，正在解锁视频...');

            // 解锁视频
            decryptedData = unlockVideoObject(decryptedData);

            // 重新加密
            const encryptedData = aesEncrypt(JSON.stringify(decryptedData));
            if (encryptedData) {
                jsonBody.data = encryptedData;
                console.log('[汤头条] 重新加密成功');
            } else {
                console.log('[汤头条] 重新加密失败');
            }

            return JSON.stringify(jsonBody);
        }

        // 情况2: 未加密响应 (data 是对象)
        if (jsonBody.data && typeof jsonBody.data === 'object') {
            console.log('[汤头条] 检测到未加密响应，直接处理...');
            jsonBody.data = unlockVideoObject(jsonBody.data);
            return JSON.stringify(jsonBody);
        }

        console.log('[汤头条] 未知响应格式');
        return body;

    } catch (e) {
        console.log('[汤头条] 处理响应失败:', e.message || e);
        return body;
    }
}

/**
 * 主入口
 */
(function main() {
    const response = $response;

    if (!response || !response.body) {
        console.log('[汤头条] 响应体为空');
        $done({});
        return;
    }

    console.log('[汤头条] ========== 开始处理 ==========');

    const modifiedBody = processDetailResponse(response.body);

    console.log('[汤头条] ========== 处理完成 ==========');

    $done({ body: modifiedBody });
})();
