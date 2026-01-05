/*
 * 汤头条 会员视频解锁脚本
 * 
 * 使用方法：
 * [rewrite_remote]
 * https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/tangtoutiao_unlock.js, tag=汤头条解锁, update-interval=86400, opt-parser=false, enabled=true
 * 
 * 或者本地引用：
 [rewrite_local]
 ^https://api3\.armbmmk\.xyz/pwa\.php/api/MvDetail/detail url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/ttt_unlock1.js
 * 
 [MITM]
 hostname = api3.armbmmk.xyz
 */

// =============================================================================
// 完整的 AES-128 实现（纯 JavaScript）
// =============================================================================

// AES S-box
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

// Rcon
const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

// 伽罗瓦域乘法
function gmul(a, b) {
    let p = 0;
    for (let i = 0; i < 8; i++) {
        if (b & 1) p ^= a;
        const hi_bit_set = a & 0x80;
        a <<= 1;
        if (hi_bit_set) a ^= 0x1b;
        b >>= 1;
    }
    return p & 0xff;
}

// 密钥扩展
function expandKey(key) {
    const w = new Array(44);

    // 复制初始密钥
    for (let i = 0; i < 4; i++) {
        w[i] = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];
    }

    // 扩展密钥
    for (let i = 4; i < 44; i++) {
        let temp = w[i - 1].slice();

        if (i % 4 === 0) {
            // RotWord
            temp = [temp[1], temp[2], temp[3], temp[0]];
            // SubWord
            temp = temp.map(b => SBOX[b]);
            // XOR Rcon
            temp[0] ^= RCON[(i / 4) - 1];
        }

        w[i] = w[i - 4].map((b, j) => b ^ temp[j]);
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
    let tmp = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = tmp;
    tmp = state[2]; state[2] = state[10]; state[10] = tmp;
    tmp = state[6]; state[6] = state[14]; state[14] = tmp;
    tmp = state[3]; state[3] = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = tmp;
}

// MixColumns
function mixColumns(state) {
    for (let c = 0; c < 4; c++) {
        const s0 = state[c * 4];
        const s1 = state[c * 4 + 1];
        const s2 = state[c * 4 + 2];
        const s3 = state[c * 4 + 3];

        state[c * 4] = gmul(s0, 2) ^ gmul(s1, 3) ^ s2 ^ s3;
        state[c * 4 + 1] = s0 ^ gmul(s1, 2) ^ gmul(s2, 3) ^ s3;
        state[c * 4 + 2] = s0 ^ s1 ^ gmul(s2, 2) ^ gmul(s3, 3);
        state[c * 4 + 3] = gmul(s0, 3) ^ s1 ^ s2 ^ gmul(s3, 2);
    }
}

// AddRoundKey
function addRoundKey(state, w, round) {
    for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
            state[r * 4 + c] ^= w[round * 4 + c][r];
        }
    }
}

// AES-128 ECB 加密单个块
function aesEncryptBlock(input, key) {
    const state = input.slice();
    const w = expandKey(key);

    addRoundKey(state, w, 0);

    for (let round = 1; round < 10; round++) {
        subBytes(state);
        shiftRows(state);
        mixColumns(state);
        addRoundKey(state, w, round);
    }

    subBytes(state);
    shiftRows(state);
    addRoundKey(state, w, 10);

    return state;
}

// =============================================================================
// 辅助函数
// =============================================================================

const AES_KEY = '7205a6c3883caf95b52db5b534e12ec3';
const AES_IV = '81d7beac44a86f43';

function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function bytesToHex(bytes) {
    return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

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

// =============================================================================
// AES-CFB 模式实现
// =============================================================================

function aesCfbDecrypt(ciphertext, key, iv) {
    const keyBytes = hexToBytes(key);
    const ivBytes = hexToBytes(iv);
    const cipherBytes = hexToBytes(ciphertext);

    const plaintext = [];
    let feedback = ivBytes.slice();

    for (let i = 0; i < cipherBytes.length; i += 16) {
        const encrypted = aesEncryptBlock(feedback, keyBytes);
        const blockSize = Math.min(16, cipherBytes.length - i);

        for (let j = 0; j < blockSize; j++) {
            plaintext.push(cipherBytes[i + j] ^ encrypted[j]);
        }

        // 更新 feedback
        if (blockSize === 16) {
            feedback = cipherBytes.slice(i, i + 16);
        } else {
            feedback = feedback.slice(blockSize).concat(cipherBytes.slice(i, i + blockSize));
        }
    }

    return plaintext;
}

function aesCfbEncrypt(plaintext, key, iv) {
    const keyBytes = hexToBytes(key);
    const ivBytes = hexToBytes(iv);
    const plainBytes = utf8ToBytes(plaintext);

    const ciphertext = [];
    let feedback = ivBytes.slice();

    for (let i = 0; i < plainBytes.length; i += 16) {
        const encrypted = aesEncryptBlock(feedback, keyBytes);
        const blockSize = Math.min(16, plainBytes.length - i);
        const cipherBlock = [];

        for (let j = 0; j < blockSize; j++) {
            const c = plainBytes[i + j] ^ encrypted[j];
            ciphertext.push(c);
            cipherBlock.push(c);
        }

        // 更新 feedback
        if (blockSize === 16) {
            feedback = cipherBlock;
        } else {
            feedback = feedback.slice(blockSize).concat(cipherBlock);
        }
    }

    return ciphertext;
}

// =============================================================================
// 主处理逻辑
// =============================================================================

function processResponse() {
    let body = $response.body;

    try {
        const responseData = JSON.parse(body);

        if (responseData.errcode !== 0) {
            console.log('[汤头条] API返回错误:', responseData.errcode);
            return body;
        }

        // 解密响应数据
        const encryptedData = responseData.data;
        const decryptedBytes = aesCfbDecrypt(encryptedData, AES_KEY, AES_IV);
        const decryptedData = bytesToUtf8(decryptedBytes);

        console.log('[汤头条] 解密成功');

        // 解析解密后的JSON
        let videoInfo = JSON.parse(decryptedData);
        let unlocked = false;

        // 解锁逻辑：替换preview_video为source_origin
        if (videoInfo.preview_video && videoInfo.source_origin) {
            console.log('[汤头条] 检测到试看视频，开始解锁...');
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
            const encryptedBytes = aesCfbEncrypt(modifiedDataStr, AES_KEY, AES_IV);
            const encryptedModifiedData = bytesToHex(encryptedBytes).toUpperCase();

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
