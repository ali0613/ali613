/**
 * 汤头条视频解锁脚本 for QuantumultX
 * 
 * 功能：解锁会员视频和金币视频
 * 原理：通过动态加载 CryptoJS 库，将 preview_video (试看链接) 替换为 source_origin (完整链接)
 [rewrite_local]
 ^https://api\d*\.armbmmk\.xyz/pwa\.php/api/(MvDetail/detail|user/userinfo|contents/detail_content|community/post_detail) url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/ttt_unlock.js
 * 
 [mitm]
 hostname = api*.armbmmk.xyz, *.armbmmk.xyz
 */

// AES-CFB-256 加解密参数
const AES_KEY_STR = '7205a6c3883caf95b52db5b534e12ec3';
const AES_IV_STR = '81d7beac44a86f43';
const CRYPTO_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
const CACHE_KEY = 'ttt_cryptojs_cache_v1'; // 缓存键名

// 全局变量存储预解析的 Key/IV
let g_parsedKey = null;
let g_parsedIv = null;

/**
 * 初始化加密环境
 */
function initCryptoEnv() {
    if (typeof CryptoJS === 'undefined') return false;
    if (!g_parsedKey) {
        g_parsedKey = CryptoJS.enc.Utf8.parse(AES_KEY_STR);
        g_parsedIv = CryptoJS.enc.Utf8.parse(AES_IV_STR);
    }
    return true;
}

/**
 * AES-CFB-256 解密
 */
function aesDecrypt(hexData) {
    try {
        const ciphertext = CryptoJS.enc.Hex.parse(hexData);
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            g_parsedKey,
            {
                iv: g_parsedIv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        );
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.log('[汤头条] 解密异常');
        return null;
    }
}

/**
 * AES-CFB-256 加密
 */
function aesEncrypt(plainText) {
    try {
        const encrypted = CryptoJS.AES.encrypt(
            plainText,
            g_parsedKey,
            {
                iv: g_parsedIv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            }
        );
        return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
    } catch (e) {
        console.log('[汤头条] 加密异常');
        return null;
    }
}

/**
 * 处理单个视频对象解锁
 */
function processVideoItem(item) {
    if (!item || typeof item !== 'object') return;
    // 必须存在 preview_video 和 source_240 才能进行动态替换
    if (!item.preview_video || !item.source_240) return;

    try {
        let url = item.preview_video;
        let dynamicDomain = '';

        // 仅从 source_240 动态获取域名
        const sourceUrl = item.source_240;
        if (sourceUrl && typeof sourceUrl === 'string') {
            const match = sourceUrl.match(/^(https?:\/\/[^\/]+)/);
            if (match) dynamicDomain = match[1];
        }

        // 1. 如果获取成功则替换，否则直接返回不处理
        if (dynamicDomain) {
            url = url.replace(/^https?:\/\/[^\/]+/, dynamicDomain);
        } else {
            return;
        }

        // 2. 移除 seconds 参数
        if (url.includes('?')) {
            let [base, query] = url.split('?');
            let params = query.split('&').filter(p => !p.startsWith('seconds='));
            url = base;
            if (params.length > 0) {
                url += '?' + params.join('&');
            }
        }

        // 3. 应用新链接
        item.preview_video = url;
        item.source_origin = url; // 同步给完整源

        // 同步修改其他清晰度
        if (item.source_240) item.source_240 = url;
        if (item.source_480) item.source_480 = url;
        if (item.source_720) item.source_720 = url;
        if (item.source_1080) item.source_1080 = url;

        // 4. 修改状态
        item.is_pay = true;
        item.isfree = 1;
        item.coins = 0;

        if (item.preview_tip) item.preview_tip = '已解锁';
        if (item.discount) item.discount = 0;
        if (item.origin_coins) item.origin_coins = 0;

    } catch (e) {
        console.log('[汤头条] URL 处理异常');
    }
}

/**
 * 核心处理逻辑
 */
// [rewrite_local] 规则更新：
// ^https://api\d*\.armbmmk\.xyz/pwa\.php/api/(MvDetail/detail|user/userinfo) url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/ttt_unlock.js

/**
 * 解锁用户信息
 */
function unlockUserInfo(data) {
    if (!data) return;

    // 处理 data.data 结构
    let userInfo = data.data;
    if (!userInfo || typeof userInfo !== 'object') return;

    console.log('[汤头条] 处理用户信息...');

    // 基础会员信息
    userInfo.vip = true;
    userInfo.coins = 999999;
    userInfo.is_vip = true; // 可能的字段变体

    // 昵称装饰（可选）
    // userInfo.nickname = userInfo.nickname + " (已解锁)";

    // 外层字段处理
    if (data.hasOwnProperty('isVip')) {
        data.isVip = true;
    }

    console.log('[汤头条] 用户信息解锁完成');
}

/**
 * 解锁黑料板块内容 (contents/detail_content)
 */
function unlockBlackContent(data) {
    if (!data) return;

    // 处理 data.cur 结构
    let content = data.data && data.data.cur ? data.data.cur : (data.cur || null);
    if (!content || typeof content !== 'object') return;

    console.log('[汤头条] 处理黑料内容...');

    content.is_pay = 1;
    content.coins = 0;
    content.need_vip = 0;

    // 外层字段处理
    if (data.hasOwnProperty('isVip')) {
        data.isVip = true;
    }

    console.log('[汤头条] 黑料内容解锁完成');
}

/**
 * 解锁圈子板块帖子 (community/post_detail)
 */
function unlockCommunityPost(data) {
    if (!data) return;

    // 处理 data.data 结构 (帖子内容)
    let post = data.data;
    if (!post || typeof post !== 'object') return;

    console.log('[汤头条] 处理圈子帖子...');

    post.is_pay = 1;
    post.unlock_coins = 0;

    // 处理视频数组 (如果有)
    if (post.videos && Array.isArray(post.videos)) {
        post.videos.forEach(video => {
            if (video.media_url === null && video.cover) {
                // 视频未解锁时 media_url 为 null
                // 无法直接获取视频链接，只能标记为已付费
            }
        });
    }

    // 外层字段处理
    if (data.hasOwnProperty('isVip')) {
        data.isVip = true;
    }

    console.log('[汤头条] 圈子帖子解锁完成');
}

/**
 * 核心处理逻辑
 */
function processBody(body) {
    try {
        // 尝试初始化环境
        if (!initCryptoEnv()) {
            console.log('[汤头条] CryptoJS 环境初始化失败');
            return body;
        }

        let jsonBody = JSON.parse(body);
        let dataToProcess = null;
        let isEncrypted = false;

        // 1. 解析数据
        if (jsonBody.data && typeof jsonBody.data === 'string' && /^[A-Fa-f0-9]+$/.test(jsonBody.data)) {
            const decryptedStr = aesDecrypt(jsonBody.data);
            if (!decryptedStr) return body;
            dataToProcess = JSON.parse(decryptedStr);
            isEncrypted = true;
        } else if (jsonBody.data && typeof jsonBody.data === 'object') {
            dataToProcess = jsonBody.data;
        } else {
            // 有些接口可能直接返回数据，不包 data (虽然少见)
            dataToProcess = jsonBody;
        }

        // 2. 根据 URL 分发处理
        const url = $request ? $request.url : '';

        if (url.includes('user/userinfo')) {
            unlockUserInfo(dataToProcess);
        } else if (url.includes('contents/detail_content')) {
            unlockBlackContent(dataToProcess);
        } else if (url.includes('community/post_detail')) {
            unlockCommunityPost(dataToProcess);
        } else if (url.includes('MvDetail/detail')) {
            // 定位并处理 detail
            if (dataToProcess) {
                let detailObj = null;
                if (dataToProcess.detail) {
                    detailObj = dataToProcess.detail;
                } else if (dataToProcess.data && dataToProcess.data.detail) {
                    detailObj = dataToProcess.data.detail;
                }

                if (detailObj && typeof detailObj === 'object') {
                    if (Array.isArray(detailObj)) {
                        if (detailObj.length > 0) processVideoItem(detailObj[0]);
                    } else {
                        processVideoItem(detailObj);
                    }
                }
            }
        } else {
            // 默认尝试处理视频（兼容旧行为或未知 URL）
            // 简单检测是否有 detail 字段
            if (dataToProcess && (dataToProcess.detail || (dataToProcess.data && dataToProcess.data.detail))) {
                let detailObj = dataToProcess.detail || dataToProcess.data.detail;
                if (Array.isArray(detailObj)) {
                    if (detailObj.length > 0) processVideoItem(detailObj[0]);
                } else {
                    processVideoItem(detailObj);
                }
            }
        }

        // 3. 重新封装/加密
        if (isEncrypted) {
            const encryptedData = aesEncrypt(JSON.stringify(dataToProcess));
            if (encryptedData) jsonBody.data = encryptedData;
        } else {
            jsonBody.data = dataToProcess; // 实际上如果是引用修改，这一步可能多余，但为了保险
        }

        return JSON.stringify(jsonBody);

    } catch (e) {
        console.log('[汤头条] 逻辑处理异常:' + e.message);
        return body;
    }
}

/**
 * 动态加载 CryptoJS 并执行
 */
function loadCryptoJSAndRun() {
    // 1. 检查全局环境
    if (typeof CryptoJS !== 'undefined') {
        runScript();
        return;
    }

    // 2. 检查本地缓存
    const cachedLib = $prefs.valueForKey(CACHE_KEY);
    if (cachedLib && cachedLib.length > 1000) {
        // console.log('[汤头条] 使用缓存加载 CryptoJS');
        try {
            eval(cachedLib);
            if (typeof CryptoJS !== 'undefined') {
                runScript();
                return;
            }
        } catch (e) {
            console.log('[汤头条] 缓存库损坏，尝试重新下载');
            $prefs.removeValueForKey(CACHE_KEY);
        }
    }

    // 3. 下载库
    console.log('[汤头条] 下载 CryptoJS...');
    $task.fetch({ url: CRYPTO_JS_URL }).then(response => {
        if (response.statusCode === 200) {
            try {
                eval(response.body);
                // 写入缓存
                $prefs.setValueForKey(response.body, CACHE_KEY);
                console.log('[汤头条] 库下载成功并缓存');
                runScript();
            } catch (e) {
                console.log('[汤头条] 库执行失败');
                $done({});
            }
        } else {
            console.log('[汤头条] 库下载失败:' + response.statusCode);
            $done({});
        }
    }, reason => {
        console.log('[汤头条] 网络请求失败');
        $done({});
    });
}

/**
 * 实际运行脚本
 */
function runScript() {
    const response = $response;
    if (!response || !response.body) {
        $done({});
        return;
    }
    const modifiedBody = processBody(response.body);
    $done({ body: modifiedBody });
}

// 启动
loadCryptoJSAndRun();
