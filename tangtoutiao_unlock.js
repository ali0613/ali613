/**
 * 汤头条视频解锁脚本
 * 适用于 QuantumultX
 * 
 * 功能：解锁会员视频和金币视频
 * 原理：将 preview_video (试看链接) 替换为 source_origin (完整链接)
 * 
 [rewrite_local]
 ^https?:\/\/api\d*\.armbmmk\.xyz\/pwa\.php\/api\/MvDetail\/detail url script-response-body https://raw.githubusercontent.com/ali0613/ali613/main/tangtoutiao_unlock.js
 * 
 [mitm]
 hostname = api*.armbmmk.xyz
 */

// AES-CFB 加密配置
const AES_KEY = '7205a6c3883caf95b52db5b534e12ec3';
const AES_IV = '81d7beac44a86f43';

// Hex 转 Uint8Array
function hexToUint8Array(hexString) {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes;
}

// Uint8Array 转 Hex
function uint8ArrayToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Uint8Array 转 UTF8 字符串
function uint8ArrayToString(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (byte < 0x80) {
            result += String.fromCharCode(byte);
        } else if (byte < 0xE0) {
            result += String.fromCharCode(((byte & 0x1F) << 6) | (bytes[++i] & 0x3F));
        } else if (byte < 0xF0) {
            result += String.fromCharCode(((byte & 0x0F) << 12) | ((bytes[++i] & 0x3F) << 6) | (bytes[++i] & 0x3F));
        } else {
            const codePoint = ((byte & 0x07) << 18) | ((bytes[++i] & 0x3F) << 12) | ((bytes[++i] & 0x3F) << 6) | (bytes[++i] & 0x3F);
            result += String.fromCodePoint(codePoint);
        }
    }
    return result;
}

// UTF8 字符串转 Uint8Array
function stringToUint8Array(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.codePointAt(i);
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x800) {
            bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
        } else if (code < 0x10000) {
            bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        } else {
            bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
            i++; // 跳过代理对的第二个字符
        }
    }
    return new Uint8Array(bytes);
}

// AES-128 单块加密 (使用查表法)
const SBOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
];

const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

// GF(2^8) 乘法
function gmul(a, b) {
    let p = 0;
    for (let i = 0; i < 8; i++) {
        if (b & 1) p ^= a;
        const hi = a & 0x80;
        a = (a << 1) & 0xff;
        if (hi) a ^= 0x1b;
        b >>= 1;
    }
    return p;
}

// 密钥扩展
function keyExpansion(key) {
    const w = new Array(44);
    for (let i = 0; i < 4; i++) {
        w[i] = (key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3];
    }
    for (let i = 4; i < 44; i++) {
        let temp = w[i - 1];
        if (i % 4 === 0) {
            temp = ((SBOX[(temp >> 16) & 0xff] << 24) |
                (SBOX[(temp >> 8) & 0xff] << 16) |
                (SBOX[temp & 0xff] << 8) |
                SBOX[(temp >> 24) & 0xff]) ^ (RCON[i / 4 - 1] << 24);
        }
        w[i] = w[i - 4] ^ temp;
    }
    return w;
}

// SubBytes
function subBytes(state) {
    for (let i = 0; i < 16; i++) {
        state[i] = SBOX[state[i]];
    }
}

// ShiftRows
function shiftRows(state) {
    let t = state[1];
    state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = t;
    t = state[2]; state[2] = state[10]; state[10] = t;
    t = state[6]; state[6] = state[14]; state[14] = t;
    t = state[15];
    state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = t;
}

// MixColumns
function mixColumns(state) {
    for (let c = 0; c < 4; c++) {
        const i = c * 4;
        const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];
        state[i] = gmul(2, a0) ^ gmul(3, a1) ^ a2 ^ a3;
        state[i + 1] = a0 ^ gmul(2, a1) ^ gmul(3, a2) ^ a3;
        state[i + 2] = a0 ^ a1 ^ gmul(2, a2) ^ gmul(3, a3);
        state[i + 3] = gmul(3, a0) ^ a1 ^ a2 ^ gmul(2, a3);
    }
}

// AddRoundKey
function addRoundKey(state, w, round) {
    for (let c = 0; c < 4; c++) {
        const word = w[round * 4 + c];
        state[c * 4] ^= (word >> 24) & 0xff;
        state[c * 4 + 1] ^= (word >> 16) & 0xff;
        state[c * 4 + 2] ^= (word >> 8) & 0xff;
        state[c * 4 + 3] ^= word & 0xff;
    }
}

// AES-128 加密单个块
function aesEncryptBlock(block, expandedKey) {
    const state = new Uint8Array(16);
    // 列优先排列
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            state[c * 4 + r] = block[r * 4 + c];
        }
    }

    addRoundKey(state, expandedKey, 0);

    for (let round = 1; round < 10; round++) {
        subBytes(state);
        shiftRows(state);
        mixColumns(state);
        addRoundKey(state, expandedKey, round);
    }

    subBytes(state);
    shiftRows(state);
    addRoundKey(state, expandedKey, 10);

    // 转换回行优先排列
    const output = new Uint8Array(16);
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            output[r * 4 + c] = state[c * 4 + r];
        }
    }
    return output;
}

// AES-CFB 解密
function aesCfbDecrypt(ciphertext, key, iv) {
    const keyBytes = hexToUint8Array(key);
    const ivBytes = hexToUint8Array(iv.padEnd(32, '0').substring(0, 32)); // IV 需要 16 字节
    const expandedKey = keyExpansion(keyBytes);

    const plaintext = new Uint8Array(ciphertext.length);
    let prevBlock = ivBytes;

    for (let i = 0; i < ciphertext.length; i += 16) {
        const encryptedIV = aesEncryptBlock(prevBlock, expandedKey);
        const blockSize = Math.min(16, ciphertext.length - i);

        for (let j = 0; j < blockSize; j++) {
            plaintext[i + j] = ciphertext[i + j] ^ encryptedIV[j];
        }

        // 下一个块使用当前密文块
        prevBlock = new Uint8Array(16);
        for (let j = 0; j < blockSize; j++) {
            prevBlock[j] = ciphertext[i + j];
        }
        if (blockSize < 16) {
            for (let j = blockSize; j < 16; j++) {
                prevBlock[j] = 0;
            }
        }
    }

    return plaintext;
}

// AES-CFB 加密
function aesCfbEncrypt(plaintext, key, iv) {
    const keyBytes = hexToUint8Array(key);
    const ivBytes = hexToUint8Array(iv.padEnd(32, '0').substring(0, 32));
    const expandedKey = keyExpansion(keyBytes);

    const ciphertext = new Uint8Array(plaintext.length);
    let prevBlock = ivBytes;

    for (let i = 0; i < plaintext.length; i += 16) {
        const encryptedIV = aesEncryptBlock(prevBlock, expandedKey);
        const blockSize = Math.min(16, plaintext.length - i);

        for (let j = 0; j < blockSize; j++) {
            ciphertext[i + j] = plaintext[i + j] ^ encryptedIV[j];
        }

        // 下一个块使用当前密文块
        prevBlock = new Uint8Array(16);
        for (let j = 0; j < blockSize; j++) {
            prevBlock[j] = ciphertext[i + j];
        }
    }

    return ciphertext;
}

// 解锁视频：将 preview_video 替换为 source_origin
function unlockVideo(jsonData) {
    let modified = false;

    // 递归处理 JSON 对象
    function processObject(obj) {
        if (typeof obj !== 'object' || obj === null) return;

        // 检查是否有 source_origin 和 preview_video 字段
        if (obj.source_origin && obj.preview_video) {
            // 使用完整视频链接替换试看链接
            obj.preview_video = obj.source_origin;
            modified = true;
            console.log('[汤头条解锁] 替换 preview_video -> source_origin');
        }

        // 处理 VIP 标识
        if (obj.is_vip !== undefined) {
            obj.is_vip = 0;
            modified = true;
        }

        // 处理金币标识
        if (obj.gold !== undefined) {
            obj.gold = 0;
            modified = true;
        }

        if (obj.need_gold !== undefined) {
            obj.need_gold = 0;
            modified = true;
        }

        // 处理付费标识
        if (obj.is_pay !== undefined) {
            obj.is_pay = 1;
            modified = true;
        }

        if (obj.is_buy !== undefined) {
            obj.is_buy = 1;
            modified = true;
        }

        // 递归处理子对象
        for (const key in obj) {
            if (typeof obj[key] === 'object') {
                processObject(obj[key]);
            }
        }
    }

    processObject(jsonData);
    return modified;
}

// 主处理函数
function main() {
    try {
        const body = $response.body;
        let jsonBody = JSON.parse(body);

        if (jsonBody.errcode !== 0 || !jsonBody.data) {
            console.log('[汤头条解锁] 响应格式异常，跳过处理');
            $done({ body: body });
            return;
        }

        // 解密数据
        const encryptedData = hexToUint8Array(jsonBody.data);
        const decryptedBytes = aesCfbDecrypt(encryptedData, AES_KEY, AES_IV);
        const decryptedStr = uint8ArrayToString(decryptedBytes);

        // 去除可能的填充字符
        const trimmedStr = decryptedStr.replace(/[\x00-\x1f]+$/, '');

        let dataJson;
        try {
            dataJson = JSON.parse(trimmedStr);
        } catch (e) {
            console.log('[汤头条解锁] 解密后 JSON 解析失败');
            $done({ body: body });
            return;
        }

        // 解锁视频
        const wasModified = unlockVideo(dataJson);

        if (wasModified) {
            // 重新加密数据
            const modifiedStr = JSON.stringify(dataJson);
            const modifiedBytes = stringToUint8Array(modifiedStr);
            const encryptedBytes = aesCfbEncrypt(modifiedBytes, AES_KEY, AES_IV);

            // 更新响应
            jsonBody.data = uint8ArrayToHex(encryptedBytes);

            console.log('[汤头条解锁] 解锁成功！');
            $done({ body: JSON.stringify(jsonBody) });
        } else {
            console.log('[汤头条解锁] 无需修改');
            $done({ body: body });
        }
    } catch (error) {
        console.log('[汤头条解锁] 处理出错: ' + error.message);
        $done({ body: $response.body });
    }
}

main();
