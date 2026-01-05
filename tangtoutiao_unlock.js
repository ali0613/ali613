/*
 * 汤头条 会员视频解锁脚本
 * [Rewrite]
 * ^https://api3\.armbmmk\.xyz/pwa\.php/api/MvDetail/detail url script-response-body tangtoutiao_unlock.js
 * [MITM]
 * hostname = api3.armbmmk.xyz
 */

const CryptoJS = require('crypto-js');

// AES解密配置
const AES_KEY = '7205a6c3883caf95b52db5b534e12ec3';
const AES_IV = '81d7beac44a86f43';

/**
 * AES-CFB 解密函数
 */
function aesDecrypt(encryptedData) {
    try {
        const key = CryptoJS.enc.Utf8.parse(AES_KEY);
        const iv = CryptoJS.enc.Utf8.parse(AES_IV);
        
        const decrypted = CryptoJS.AES.decrypt(
            {
                ciphertext: CryptoJS.enc.Hex.parse(encryptedData)
            },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        );
        
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.log('解密失败:', e);
        return null;
    }
}

/**
 * AES-CFB 加密函数
 */
function aesEncrypt(data) {
    try {
        const key = CryptoJS.enc.Utf8.parse(AES_KEY);
        const iv = CryptoJS.enc.Utf8.parse(AES_IV);
        
        const encrypted = CryptoJS.AES.encrypt(
            data,
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        );
        
        return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
    } catch (e) {
        console.log('加密失败:', e);
        return null;
    }
}

/**
 * 主处理函数
 */
function main() {
    let body = $response.body;
    
    try {
        // 解析响应数据
        const responseData = JSON.parse(body);
        
        if (responseData.errcode !== 0) {
            console.log('API返回错误:', responseData);
            return body;
        }
        
        // 解密响应数据
        const encryptedData = responseData.data;
        const decryptedData = aesDecrypt(encryptedData);
        
        if (!decryptedData) {
            console.log('解密失败');
            return body;
        }
        
        // 解析解密后的JSON
        let videoInfo = JSON.parse(decryptedData);
        console.log('原始视频信息:', JSON.stringify(videoInfo, null, 2));
        
        // 解锁逻辑：替换preview_video为source_origin
        if (videoInfo.preview_video && videoInfo.source_origin) {
            console.log('检测到试看视频，正在解锁...');
            console.log('原preview_video:', videoInfo.preview_video);
            console.log('source_origin:', videoInfo.source_origin);
            
            // 将试看视频链接替换为完整视频链接
            videoInfo.preview_video = videoInfo.source_origin;
            
            // 如果有会员标识，移除会员限制
            if (videoInfo.is_vip) {
                videoInfo.is_vip = 0;
            }
            if (videoInfo.vip_only) {
                videoInfo.vip_only = 0;
            }
            if (videoInfo.need_coin) {
                videoInfo.need_coin = 0;
            }
            
            console.log('解锁成功！');
        }
        
        // 重新加密修改后的数据
        const modifiedDataStr = JSON.stringify(videoInfo);
        const encryptedModifiedData = aesEncrypt(modifiedDataStr);
        
        if (!encryptedModifiedData) {
            console.log('加密失败');
            return body;
        }
        
        // 构建新的响应
        responseData.data = encryptedModifiedData;
        
        body = JSON.stringify(responseData);
        console.log('已返回解锁后的数据');
        
    } catch (e) {
        console.log('处理异常:', e);
        console.log('异常堆栈:', e.stack);
    }
    
    return body;
}

// 执行脚本
$done({body: main()});
