/**
 * 汤头条会员/金币视频解锁脚本
 * 
 * 适用于: QuantumultX
 * 功能: 解锁会员和金币视频，替换preview_video为source_origin完整链接
 * 加密算法: AES-CFB-256, NoPadding
 * 
[rewrite_local]
^https:\/\/api\d*\.armbmmk\.xyz\/pwa\.php\/api\/MvDetail\/detail url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/tangtoutiao_unlock.js
 * 
[mitm]
hostname = api*.armbmmk.xyz
 */

const AES_KEY = "7205a6c3883caf95b52db5b534e12ec3";
const AES_IV = "81d7beac44a86f43";

// AES-CFB-256 解密
function aesDecrypt(hexData) {
    const key = hexToBytes(AES_KEY);
    const iv = hexToBytes(AES_IV);
    const data = hexToBytes(hexData);

    // CFB模式手动实现 (256位密钥, 128位分组)
    const blockSize = 16;
    const result = new Uint8Array(data.length);
    let feedback = iv;

    for (let i = 0; i < data.length; i += blockSize) {
        // 加密feedback得到keystream
        const keystream = aesEncryptBlock(feedback, key);

        // 计算当前块的实际长度
        const blockLen = Math.min(blockSize, data.length - i);

        // XOR解密
        for (let j = 0; j < blockLen; j++) {
            result[i + j] = data[i + j] ^ keystream[j];
        }

        // 更新feedback为密文块
        if (i + blockSize <= data.length) {
            feedback = data.slice(i, i + blockSize);
        } else {
            feedback = new Uint8Array(blockSize);
            feedback.set(data.slice(i));
        }
    }

    return bytesToUtf8(result);
}

// AES-CFB-256 加密
function aesEncrypt(text) {
    const key = hexToBytes(AES_KEY);
    const iv = hexToBytes(AES_IV);
    const data = utf8ToBytes(text);

    const blockSize = 16;
    const result = new Uint8Array(data.length);
    let feedback = iv;

    for (let i = 0; i < data.length; i += blockSize) {
        const keystream = aesEncryptBlock(feedback, key);
        const blockLen = Math.min(blockSize, data.length - i);

        for (let j = 0; j < blockLen; j++) {
            result[i + j] = data[i + j] ^ keystream[j];
        }

        // CFB模式: 更新feedback为密文块
        if (i + blockSize <= data.length) {
            feedback = result.slice(i, i + blockSize);
        } else {
            feedback = new Uint8Array(blockSize);
            feedback.set(result.slice(i));
        }
    }

    return bytesToHex(result).toUpperCase();
}

// AES单块加密 (使用S-Box等实现)
function aesEncryptBlock(input, key) {
    // 完整AES-256实现
    const Nb = 4; // 块列数
    const Nk = 8; // 密钥列数 (256位)
    const Nr = 14; // 轮数

    // S-Box
    const sbox = [
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
    const rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

    // 密钥扩展
    function keyExpansion(key) {
        const w = new Uint8Array(Nb * (Nr + 1) * 4);
        let i = 0;

        // 复制原始密钥
        for (i = 0; i < Nk * 4; i++) {
            w[i] = key[i];
        }

        i = Nk;
        while (i < Nb * (Nr + 1)) {
            let temp = w.slice((i - 1) * 4, i * 4);

            if (i % Nk === 0) {
                // RotWord
                temp = new Uint8Array([temp[1], temp[2], temp[3], temp[0]]);
                // SubWord
                temp = new Uint8Array([sbox[temp[0]], sbox[temp[1]], sbox[temp[2]], sbox[temp[3]]]);
                temp[0] ^= rcon[(i / Nk) - 1];
            } else if (Nk > 6 && i % Nk === 4) {
                temp = new Uint8Array([sbox[temp[0]], sbox[temp[1]], sbox[temp[2]], sbox[temp[3]]]);
            }

            for (let j = 0; j < 4; j++) {
                w[i * 4 + j] = w[(i - Nk) * 4 + j] ^ temp[j];
            }
            i++;
        }

        return w;
    }

    // GF(2^8)乘法
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

    // SubBytes
    function subBytes(state) {
        for (let i = 0; i < 16; i++) {
            state[i] = sbox[state[i]];
        }
    }

    // ShiftRows
    function shiftRows(state) {
        // Row 1: shift left 1
        let temp = state[1];
        state[1] = state[5];
        state[5] = state[9];
        state[9] = state[13];
        state[13] = temp;

        // Row 2: shift left 2
        temp = state[2];
        state[2] = state[10];
        state[10] = temp;
        temp = state[6];
        state[6] = state[14];
        state[14] = temp;

        // Row 3: shift left 3
        temp = state[15];
        state[15] = state[11];
        state[11] = state[7];
        state[7] = state[3];
        state[3] = temp;
    }

    // MixColumns
    function mixColumns(state) {
        for (let c = 0; c < 4; c++) {
            const col = c * 4;
            const a0 = state[col];
            const a1 = state[col + 1];
            const a2 = state[col + 2];
            const a3 = state[col + 3];

            state[col] = gmul(a0, 2) ^ gmul(a1, 3) ^ a2 ^ a3;
            state[col + 1] = a0 ^ gmul(a1, 2) ^ gmul(a2, 3) ^ a3;
            state[col + 2] = a0 ^ a1 ^ gmul(a2, 2) ^ gmul(a3, 3);
            state[col + 3] = gmul(a0, 3) ^ a1 ^ a2 ^ gmul(a3, 2);
        }
    }

    // AddRoundKey
    function addRoundKey(state, roundKey, round) {
        for (let i = 0; i < 16; i++) {
            state[i] ^= roundKey[round * 16 + i];
        }
    }

    // 执行加密
    const expandedKey = keyExpansion(key);
    const state = new Uint8Array(input);

    addRoundKey(state, expandedKey, 0);

    for (let round = 1; round < Nr; round++) {
        subBytes(state);
        shiftRows(state);
        mixColumns(state);
        addRoundKey(state, expandedKey, round);
    }

    subBytes(state);
    shiftRows(state);
    addRoundKey(state, expandedKey, Nr);

    return state;
}

// 工具函数
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToUtf8(bytes) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}

function utf8ToBytes(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

// 处理视频数据，替换预览视频为完整视频
function unlockVideo(data) {
    try {
        // 检查是否是会员/金币视频
        if (data.video_info) {
            const videoInfo = data.video_info;

            // 如果有source_origin完整链接，用它替换preview_video
            if (videoInfo.source_origin && videoInfo.preview_video) {
                console.log("[汤头条解锁] 发现会员视频，正在解锁...");
                videoInfo.preview_video = videoInfo.source_origin;
                videoInfo.is_vip = 0;  // 标记为非VIP视频
                videoInfo.is_gold = 0; // 标记为非金币视频
                videoInfo.gold = 0;    // 金币数设为0
                console.log("[汤头条解锁] 视频解锁成功!");
            }

            // 处理source字段
            if (videoInfo.source && videoInfo.source_origin) {
                videoInfo.source = videoInfo.source_origin;
            }
        }

        // 处理视频列表
        if (data.list && Array.isArray(data.list)) {
            data.list.forEach(item => {
                if (item.source_origin && item.preview_video) {
                    item.preview_video = item.source_origin;
                    item.is_vip = 0;
                    item.is_gold = 0;
                    item.gold = 0;
                }
                if (item.source && item.source_origin) {
                    item.source = item.source_origin;
                }
            });
        }

        return data;
    } catch (e) {
        console.log("[汤头条解锁] 处理数据错误:", e.message);
        return data;
    }
}

// 主处理函数
function main() {
    try {
        let response = $response.body;
        let obj = JSON.parse(response);

        if (obj.errcode === 0 && obj.data) {
            console.log("[汤头条解锁] 开始解密数据...");

            // 解密数据
            const decryptedStr = aesDecrypt(obj.data);
            let decryptedData = JSON.parse(decryptedStr);

            console.log("[汤头条解锁] 解密成功，处理视频数据...");

            // 解锁视频
            decryptedData = unlockVideo(decryptedData);

            // 重新加密
            const encryptedData = aesEncrypt(JSON.stringify(decryptedData));
            obj.data = encryptedData;

            console.log("[汤头条解锁] 处理完成!");

            $done({ body: JSON.stringify(obj) });
        } else {
            $done({ body: response });
        }
    } catch (e) {
        console.log("[汤头条解锁] 错误:", e.message);
        $done({ body: $response.body });
    }
}

main();
