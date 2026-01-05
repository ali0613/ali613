/**
 * @name 汤头条解锁会员金币视频
 * @version 1.0.0
 * @description 替换 preview_video 为 source_origin，解锁完整版视频
 * @author Antigravity
 * 
[rewrite_local]
^https:\/\/api3\.armbmmk\.xyz\/pwa\.php\/api\/MvDetail\/detail url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/tangtoutiao_unlock.js
 * 
[mitm]
hostname = api3.armbmmk.xyz
 */

// 引用 CryptoJS，Quantumult X 需要在配置或脚本头部确保能加载此库
// 如果本地没有，可以使用 CDN (Qx 1.0.29+ 支持远程引用)
// 也可以将 crypto-js 的内容直接粘贴到此脚本顶部，为了保持整洁这里使用远程引用方式
// 如果脚本执行失败，请手动下载 crypto-js.js 并替换引用或粘贴内容
// 注意: Quantumult X 的 @require 并不是所有版本都完美支持，建议用户自行确认环境
// @require https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/crypto-js.min.js

const keyStr = "7205a6c3883caf95b52db5b534e12ec3";
const ivStr = "81d7beac44a86f43";

function run() {
    try {
        let body = $response.body;
        if (!body) {
            $done({});
            return;
        }

        let respObj = JSON.parse(body);
        let encryptedData = respObj.data;

        if (!encryptedData) {
            console.log("TangToutiao: No encrypted data found");
            $done({});
            return;
        }

        // 解密
        let key = CryptoJS.enc.Utf8.parse(keyStr);
        let iv = CryptoJS.enc.Utf8.parse(ivStr);

        let decrypted = CryptoJS.AES.decrypt(
            { ciphertext: CryptoJS.enc.Hex.parse(encryptedData) },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        ).toString(CryptoJS.enc.Utf8);

        if (!decrypted) {
            console.log("TangToutiao: Decryption failed");
            $done({});
            return;
        }

        let contentObj = JSON.parse(decrypted);

        // 修改逻辑：替换 preview_video 为 source_origin
        if (contentObj && contentObj.data && contentObj.data.detail) {
            let detail = contentObj.data.detail;

            // 解锁逻辑
            if (detail.source_origin) {
                // 将试看链接替换为完整链接
                detail.preview_video = detail.source_origin;
                console.log("TangToutiao: Replaced preview_video with source_origin");
            }

            // 顺便处理 VIP 字段 (可选)
            detail.is_vip = 1;
            detail.is_buy = 1;
            detail.gold = 0;
            if (detail.user) {
                detail.user.is_vip = 1;
            }
        }

        // 加密回写
        // 注意：原数据是 Hex 编码的 Ciphertext
        let modifiedContent = JSON.stringify(contentObj);
        let encrypted = CryptoJS.AES.encrypt(
            modifiedContent,
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        );

        // CryptoJS encrypt returns a CipherParams object/formatted string.
        // We need the raw ciphertext in Hex.
        respObj.data = encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();

        $done({ body: JSON.stringify(respObj) });

    } catch (e) {
        console.log("TangToutiao Script Error: " + e.message);
        $done({});
    }
}

run();
