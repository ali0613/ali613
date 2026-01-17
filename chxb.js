/* === Quantumult X 重写规则 ===

[rewrite_local]
# 修改购买请求中的 money 为 0
^http://104\.233\.223\.2:7781/api/buy url script-request-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/chxb.js

[mitm]
hostname = 104.233.223.2
*/

// === chxb.js (QX 版本，无需外部库) ===

const config = {
    key: 'GftZqNEoBVdB2kwx',
    iv: '3zyJFPEzh5rUeUNi'
};

// 获取请求体
const body = $request.body;
const bodyObj = JSON.parse(body);

// 使用 QX 内置 AES 解密
const decryptedBytes = $crypto.AES.decrypt(
    bodyObj.data,
    $crypto.MD5(config.key).toString(),
    {
        iv: $crypto.MD5(config.iv).toString(),
        mode: 'cbc',
        padding: 'pkcs7'
    }
);

const decryptedData = decryptedBytes.toString('utf8');

// 解析 JSON 并修改 money 为 0
const dataObj = JSON.parse(decryptedData);
dataObj.money = 0;

// 重新序列化为紧凑 JSON
const newDataStr = JSON.stringify(dataObj);

// 使用 QX 内置 AES 加密
const encryptedBytes = $crypto.AES.encrypt(
    newDataStr,
    $crypto.MD5(config.key).toString(),
    {
        iv: $crypto.MD5(config.iv).toString(),
        mode: 'cbc',
        padding: 'pkcs7'
    }
);

const newEncrypted = encryptedBytes.toString('base64');

// 重新构建请求体
const newBody = JSON.stringify({ data: newEncrypted });

$done({ body: newBody });
