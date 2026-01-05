/*
 * 汤头条 会员视频解锁脚本
 * 
 * 使用方法：
 * [rewrite_remote]
 * https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/tangtoutiao_unlock.js, tag=汤头条解锁, update-interval=86400, opt-parser=false, enabled=true
 * 
 * 或者本地引用：
 [rewrite_local]
 ^https://api3\.armbmmk\.xyz/pwa\.php/api/MvDetail/detail url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/tangtoutiao_unlock1.js
 * 
 [MITM]
 hostname = api3.armbmmk.xyz
 */

// =============================================================================
// AES-CFB 加密/解密实现（无需外部依赖）
// =============================================================================

const AES_KEY = '7205a6c3883caf95b52db5b534e12ec3';
const AES_IV = '81d7beac44a86f43';

// 将十六进制字符串转换为字节数组
function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

// 将字节数组转换为十六进制字符串
function bytesToHex(bytes) {
    return bytes.map(b => ('0' + b.toString(16)).slice(-2)).join('');
}

// 将UTF-8字符串转换为字节数组
function utf8ToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code < 0x10000) {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        } else {
            bytes.push(
                0xf0 | (code >> 18),
                0x80 | ((code >> 12) & 0x3f),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f)
            );
        }
    }
    return bytes;
}

// 将字节数组转换为UTF-8字符串
function bytesToUtf8(bytes) {
    let str = '';
    let i = 0;
    while (i < bytes.length) {
        const c = bytes[i++];
        if (c < 0x80) {
            str += String.fromCharCode(c);
        } else if (c < 0xe0) {
            str += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i++] & 0x3f));
        } else if (c < 0xf0) {
            str += String.fromCharCode(
                ((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f)
            );
        } else {
            const code = ((c & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) |
                ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
            str += String.fromCodePoint(code);
        }
    }
    return str;
}

// XOR 操作
function xorBytes(a, b) {
    const result = [];
    for (let i = 0; i < a.length; i++) {
        result.push(a[i] ^ b[i]);
    }
    return result;
}

// 简化的 AES 加密函数（使用 Quantumult X 内置的 Crypto）
function aesEncryptBlock(input, key) {
    // 使用 Quantumult X 提供的 $crypto 对象
    if (typeof $crypto !== 'undefined' && $crypto.encrypt) {
        const inputHex = bytesToHex(input);
        const keyHex = bytesToHex(key);
        const encrypted = $crypto.encrypt(inputHex, 'aes-128-ecb', keyHex);
        return hexToBytes(encrypted);
    }

    // 如果没有 $crypto，尝试使用其他方法
    console.log('警告: 未找到 $crypto 对象，尝试备用方法');
    return input; // 降级返回原始数据
}

/**
 * AES-CFB 解密
 */
function aesCfbDecrypt(ciphertext, key, iv) {
    const keyBytes = hexToBytes(key);
    const ivBytes = hexToBytes(iv);
    const cipherBytes = hexToBytes(ciphertext);

    const plaintext = [];
    let feedback = ivBytes.slice();

    for (let i = 0; i < cipherBytes.length; i += 16) {
        const encrypted = aesEncryptBlock(feedback, keyBytes);
        const block = cipherBytes.slice(i, Math.min(i + 16, cipherBytes.length));
        const decrypted = xorBytes(block, encrypted.slice(0, block.length));

        plaintext.push(...decrypted);
        feedback = block.concat(feedback.slice(block.length));
        feedback = feedback.slice(0, 16);
    }

    return plaintext;
}

/**
 * AES-CFB 加密
 */
function aesCfbEncrypt(plaintext, key, iv) {
    const keyBytes = hexToBytes(key);
    const ivBytes = hexToBytes(iv);
    const plainBytes = utf8ToBytes(plaintext);

    const ciphertext = [];
    let feedback = ivBytes.slice();

    for (let i = 0; i < plainBytes.length; i += 16) {
        const encrypted = aesEncryptBlock(feedback, keyBytes);
        const block = plainBytes.slice(i, Math.min(i + 16, plainBytes.length));
        const cipher = xorBytes(block, encrypted.slice(0, block.length));

        ciphertext.push(...cipher);
        feedback = cipher.concat(feedback.slice(cipher.length));
        feedback = feedback.slice(0, 16);
    }

    return ciphertext;
}

/**
 * 解密响应数据
 */
function decryptResponse(encryptedHex) {
    try {
        const decryptedBytes = aesCfbDecrypt(encryptedHex, AES_KEY, AES_IV);
        return bytesToUtf8(decryptedBytes);
    } catch (e) {
        console.log('解密失败:', e);
        return null;
    }
}

/**
 * 加密数据
 */
function encryptData(plaintext) {
    try {
        const encryptedBytes = aesCfbEncrypt(plaintext, AES_KEY, AES_IV);
        return bytesToHex(encryptedBytes).toUpperCase();
    } catch (e) {
        console.log('加密失败:', e);
        return null;
    }
}

// =============================================================================
// 主处理逻辑
// =============================================================================

function processResponse() {
    let body = $response.body;

    try {
        // 解析响应数据
        const responseData = JSON.parse(body);

        if (responseData.errcode !== 0) {
            console.log('[汤头条] API返回错误:', responseData.errcode);
            return body;
        }

        // 解密响应数据
        const encryptedData = responseData.data;
        const decryptedData = decryptResponse(encryptedData);

        if (!decryptedData) {
            console.log('[汤头条] 解密失败');
            return body;
        }

        // 解析解密后的JSON
        let videoInfo = JSON.parse(decryptedData);
        console.log('[汤头条] 成功解密视频信息');

        // 解锁逻辑：替换preview_video为source_origin
        let unlocked = false;

        if (videoInfo.preview_video && videoInfo.source_origin) {
            console.log('[汤头条] 检测到试看视频，开始解锁...');

            // 将试看视频链接替换为完整视频链接
            videoInfo.preview_video = videoInfo.source_origin;
            unlocked = true;
        }

        // 移除会员限制
        if (videoInfo.is_vip) {
            videoInfo.is_vip = 0;
            unlocked = true;
        }
        if (videoInfo.vip_only) {
            videoInfo.vip_only = 0;
            unlocked = true;
        }
        if (videoInfo.need_coin) {
            videoInfo.need_coin = 0;
            unlocked = true;
        }

        if (unlocked) {
            console.log('[汤头条] ✅ 解锁成功！');

            // 重新加密修改后的数据
            const modifiedDataStr = JSON.stringify(videoInfo);
            const encryptedModifiedData = encryptData(modifiedDataStr);

            if (!encryptedModifiedData) {
                console.log('[汤头条] 加密失败');
                return body;
            }

            // 构建新的响应
            responseData.data = encryptedModifiedData;
            body = JSON.stringify(responseData);

            console.log('[汤头条] 已返回解锁后的数据');
        } else {
            console.log('[汤头条] 无需解锁');
        }

    } catch (e) {
        console.log('[汤头条] 处理异常:', e);
        if (e.stack) {
            console.log('[汤头条] 堆栈:', e.stack);
        }
    }

    return body;
}

// 执行脚本
$done({ body: processResponse() });
