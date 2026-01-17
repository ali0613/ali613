/* === Quantumult X 重写规则 ===

[rewrite_local]
# 修改购买请求中的 money 为 0
^http://104\.233\.223\.2:7781/api/buy url script-request-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/chxb.js

[mitm]
hostname = 104.233.223.2
*/

// === buy_modify.js (远程脚本) ===
// 保存到你的 GitHub 或服务器上

function aesDecrypt(encryptedB64, key, iv) {
    const CryptoJS = require('crypto-js');
    const encrypted = CryptoJS.enc.Base64.parse(encryptedB64);
    const keyBytes = CryptoJS.enc.Utf8.parse(key);
    const ivBytes = CryptoJS.enc.Utf8.parse(iv);
    const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted },
        keyBytes,
        { 
            iv: ivBytes, 
            mode: CryptoJS.mode.CBC, 
            padding: CryptoJS.pad.Pkcs7 
        }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
}

function aesEncrypt(dataStr, key, iv) {
    const CryptoJS = require('crypto-js');
    const keyBytes = CryptoJS.enc.Utf8.parse(key);
    const ivBytes = CryptoJS.enc.Utf8.parse(iv);
    const encrypted = CryptoJS.AES.encrypt(
        dataStr,
        keyBytes,
        { 
            iv: ivBytes, 
            mode: CryptoJS.mode.CBC, 
            padding: CryptoJS.pad.Pkcs7 
        }
    );
    return encrypted.toString();
}

const config = {
    key: 'GftZqNEoBVdB2kwx',
    iv: '3zyJFPEzh5rUeUNi'
};

// 获取请求体
const body = $request.body;
const bodyObj = JSON.parse(body);

// 解密 data 字段
const decryptedData = aesDecrypt(bodyObj.data, config.key, config.iv);

// 解析 JSON 并修改 money 为 0
const dataObj = JSON.parse(decryptedData);
dataObj.money = 0;

// 重新序列化为紧凑 JSON（无空格）
const newDataStr = JSON.stringify(dataObj).replace(/\s+/g, '');

// 重新加密
const newEncrypted = aesEncrypt(newDataStr, config.key, config.iv);

// 重新构建请求体
const newBody = JSON.stringify({ data: newEncrypted });

$done({ body: newBody });
