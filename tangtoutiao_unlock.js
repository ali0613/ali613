/**
 * 汤头条会员/金币视频解锁脚本
 * 
 * 适用于: QuantumultX
 * 功能: 解锁会员和金币视频，替换preview_video为source_origin完整链接
 * 加密算法: AES-128-CFB, NoPadding
 * 
 [rewrite_local]
 ^https:\/\/api\d*\.armbmmk\.xyz\/pwa\.php\/api\/MvDetail\/detail url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/tangtoutiao_unlock.js
 * 
 [mitm]
 hostname = api*.armbmmk.xyz
 */

var AES_KEY_HEX = "7205a6c3883caf95b52db5b534e12ec3"; // 16字节 = 128位
var AES_IV_HEX = "81d7beac44a86f43"; // 8字节hex, 需要补齐到16字节

// S-Box
var SBOX = [
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

var RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

// ==================== 工具函数 ====================

function hexToBytes(hex) {
    var bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
        hex += ('0' + bytes[i].toString(16)).slice(-2);
    }
    return hex.toUpperCase();
}

function strToBytes(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 128) {
            bytes.push(c);
        } else if (c < 2048) {
            bytes.push((c >> 6) | 192);
            bytes.push((c & 63) | 128);
        } else {
            bytes.push((c >> 12) | 224);
            bytes.push(((c >> 6) & 63) | 128);
            bytes.push((c & 63) | 128);
        }
    }
    return bytes;
}

function bytesToStr(bytes) {
    var str = '';
    var i = 0;
    while (i < bytes.length) {
        var c = bytes[i];
        if (c < 128) {
            str += String.fromCharCode(c);
            i++;
        } else if (c > 191 && c < 224) {
            str += String.fromCharCode(((c & 31) << 6) | (bytes[i + 1] & 63));
            i += 2;
        } else {
            str += String.fromCharCode(((c & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63));
            i += 3;
        }
    }
    return str;
}

// 将hex IV转换为16字节（8字节hex + 8字节0填充）
function getIV() {
    var ivBytes = hexToBytes(AES_IV_HEX);
    // 补齐到16字节
    while (ivBytes.length < 16) {
        ivBytes.push(0);
    }
    return ivBytes;
}

// ==================== AES-128 实现 ====================

function gmul(a, b) {
    var p = 0;
    for (var i = 0; i < 8; i++) {
        if (b & 1) p ^= a;
        var hi = a & 0x80;
        a = (a << 1) & 0xff;
        if (hi) a ^= 0x1b;
        b >>= 1;
    }
    return p;
}

// AES-128 密钥扩展 (Nk=4, Nr=10)
function keyExpansion128(key) {
    var Nk = 4, Nr = 10, Nb = 4;
    var w = [];
    var i, j;

    for (i = 0; i < Nk * 4; i++) {
        w[i] = key[i];
    }

    for (i = Nk; i < Nb * (Nr + 1); i++) {
        var temp = [w[(i - 1) * 4], w[(i - 1) * 4 + 1], w[(i - 1) * 4 + 2], w[(i - 1) * 4 + 3]];

        if (i % Nk === 0) {
            temp = [SBOX[temp[1]], SBOX[temp[2]], SBOX[temp[3]], SBOX[temp[0]]];
            temp[0] ^= RCON[Math.floor(i / Nk) - 1];
        }

        for (j = 0; j < 4; j++) {
            w[i * 4 + j] = w[(i - Nk) * 4 + j] ^ temp[j];
        }
    }

    return w;
}

// AES-128 单块加密 (Nr=10)
function aesEncryptBlock128(input, expandedKey) {
    var Nr = 10;
    var state = input.slice(0);
    var i, round;

    // 初始轮密钥加
    for (i = 0; i < 16; i++) {
        state[i] ^= expandedKey[i];
    }

    for (round = 1; round <= Nr; round++) {
        // SubBytes
        for (i = 0; i < 16; i++) {
            state[i] = SBOX[state[i]];
        }

        // ShiftRows
        var temp = state[1];
        state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = temp;

        temp = state[2]; state[2] = state[10]; state[10] = temp;
        temp = state[6]; state[6] = state[14]; state[14] = temp;

        temp = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = temp;

        // MixColumns (最后一轮跳过)
        if (round < Nr) {
            for (var c = 0; c < 4; c++) {
                var col = c * 4;
                var a0 = state[col], a1 = state[col + 1], a2 = state[col + 2], a3 = state[col + 3];
                state[col] = gmul(a0, 2) ^ gmul(a1, 3) ^ a2 ^ a3;
                state[col + 1] = a0 ^ gmul(a1, 2) ^ gmul(a2, 3) ^ a3;
                state[col + 2] = a0 ^ a1 ^ gmul(a2, 2) ^ gmul(a3, 3);
                state[col + 3] = gmul(a0, 3) ^ a1 ^ a2 ^ gmul(a3, 2);
            }
        }

        // AddRoundKey
        for (i = 0; i < 16; i++) {
            state[i] ^= expandedKey[round * 16 + i];
        }
    }

    return state;
}

// ==================== CFB 模式 (AES-128) ====================

function aesCfbDecrypt(hexData, keyHex) {
    var key = hexToBytes(keyHex);
    var iv = getIV();
    var data = hexToBytes(hexData);
    var expandedKey = keyExpansion128(key);

    var blockSize = 16;
    var result = [];
    var feedback = iv.slice(0);

    for (var i = 0; i < data.length; i += blockSize) {
        var keystream = aesEncryptBlock128(feedback, expandedKey);
        var blockLen = Math.min(blockSize, data.length - i);

        for (var j = 0; j < blockLen; j++) {
            result.push(data[i + j] ^ keystream[j]);
        }

        // 更新feedback为密文块
        feedback = [];
        for (var k = 0; k < blockSize; k++) {
            if (i + k < data.length) {
                feedback.push(data[i + k]);
            } else {
                feedback.push(0);
            }
        }
    }

    return bytesToStr(result);
}

function aesCfbEncrypt(text, keyHex) {
    var key = hexToBytes(keyHex);
    var iv = getIV();
    var data = strToBytes(text);
    var expandedKey = keyExpansion128(key);

    var blockSize = 16;
    var result = [];
    var feedback = iv.slice(0);

    for (var i = 0; i < data.length; i += blockSize) {
        var keystream = aesEncryptBlock128(feedback, expandedKey);
        var blockLen = Math.min(blockSize, data.length - i);

        var encBlock = [];
        for (var j = 0; j < blockLen; j++) {
            var enc = data[i + j] ^ keystream[j];
            result.push(enc);
            encBlock.push(enc);
        }

        // 更新feedback为密文块
        feedback = [];
        for (var k = 0; k < blockSize; k++) {
            if (k < encBlock.length) {
                feedback.push(encBlock[k]);
            } else {
                feedback.push(0);
            }
        }
    }

    return bytesToHex(result);
}

// ==================== 视频解锁逻辑 ====================

function unlockVideo(data) {
    var modified = false;

    // 处理video_info
    if (data.video_info) {
        var info = data.video_info;
        if (info.source_origin) {
            if (info.preview_video) {
                info.preview_video = info.source_origin;
                modified = true;
            }
            if (info.source) {
                info.source = info.source_origin;
            }
            info.is_vip = 0;
            info.is_gold = 0;
            info.gold = 0;
        }
    }

    // 直接处理顶层字段
    if (data.source_origin) {
        if (data.preview_video) {
            data.preview_video = data.source_origin;
            modified = true;
        }
        if (data.source) {
            data.source = data.source_origin;
        }
        data.is_vip = 0;
        data.is_gold = 0;
        data.gold = 0;
    }

    // 处理列表
    if (data.list && Array.isArray(data.list)) {
        for (var i = 0; i < data.list.length; i++) {
            var item = data.list[i];
            if (item.source_origin) {
                if (item.preview_video) {
                    item.preview_video = item.source_origin;
                    modified = true;
                }
                if (item.source) {
                    item.source = item.source_origin;
                }
                item.is_vip = 0;
                item.is_gold = 0;
                item.gold = 0;
            }
        }
    }

    if (modified) {
        console.log("[汤头条解锁] 视频解锁成功!");
    }

    return data;
}

// ==================== 主函数 ====================

function main() {
    try {
        var response = $response.body;
        var obj = JSON.parse(response);

        if (obj.errcode === 0 && obj.data) {
            console.log("[汤头条解锁] 开始解密数据...");

            // 解密
            var decryptedStr = aesCfbDecrypt(obj.data, AES_KEY_HEX);
            console.log("[汤头条解锁] 解密成功，数据长度: " + decryptedStr.length);

            // 打印前100字符用于调试
            console.log("[汤头条解锁] 数据预览: " + decryptedStr.substring(0, 100));

            var decryptedData = JSON.parse(decryptedStr);

            // 解锁
            decryptedData = unlockVideo(decryptedData);

            // 加密
            var encryptedData = aesCfbEncrypt(JSON.stringify(decryptedData), AES_KEY_HEX);
            obj.data = encryptedData;

            console.log("[汤头条解锁] 处理完成!");
            $done({ body: JSON.stringify(obj) });
        } else {
            $done({ body: response });
        }
    } catch (e) {
        console.log("[汤头条解锁] 错误: " + e.message);
        $done({ body: $response.body });
    }
}

main();
