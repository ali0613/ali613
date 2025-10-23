/*
 * Quantumult X 粉笔网权限重写脚本
 * 功能：
 * 1. 修改 question_episodes_with_multi_type 接口响应，解锁权限
 * 2. 拦截 mediafile/meta 接口，使用存储的cookie重新请求
 * 使用方法：
 [rewrite_local]
 * # 响应重写 - 修改权限
 ^https?:\/\/ke\.fenbi\.com\/iphone\/gwy\/v3\/episodes\/question_episodes_with_multi_type url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi.js
 * 
 * # 请求重写 - 替换响应
 ^https?:\/\/ke\.fenbi\.com\/iphone\/gwy\/v3\/episodes\/[^/]+\/mediafile\/meta url script-request-header https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi.js
 [mitm]
 hostname = ke.fenbi.com
 */

// ==================== 配置区域 ====================

const COOKIE_KEY = 'fenbi_cookie'; // 存储Cookie的键名

// ==================== 工具函数 ====================

/**
 * 判断是否为响应处理（通过是否有response body判断）
 */
function isResponseHandler() {
    return typeof $response !== 'undefined' && $response.body;
}

/**
 * 判断是否为请求处理
 */
function isRequestHandler() {
    return typeof $response === 'undefined' || !$response.body;
}

/**
 * 获取URL
 */
function getUrl() {
    if (typeof $request !== 'undefined') {
        return $request.url;
    }
    return '';
}

/**
 * 异步HTTP请求
 */
function httpRequest(options) {
    return new Promise((resolve, reject) => {
        $task.fetch(options).then(response => {
            resolve(response);
        }, reason => {
            reject(reason);
        });
    });
}

// ==================== 主程序 ====================

(async () => {
    const url = getUrl();
    
    console.log(`\n========================================`);
    console.log(`🔄 粉笔网权限重写脚本`);
    console.log(`📍 请求URL: ${url}`);
    console.log(`========================================\n`);
    
    try {
        // ===== 处理 question_episodes_with_multi_type 接口响应 =====
        if (url.includes('/question_episodes_with_multi_type') && isResponseHandler()) {
            console.log(`📝 处理类型: 响应重写`);
            console.log(`🎯 目标: 修改 hasPermission 权限`);
            
            let body = $response.body;
            let modifiedCount = 0;
            
            // 修改 hasPermission":false 为 hasPermission":true
            const originalBody = body;
            body = body.replace(/"hasPermission"\s*:\s*false/g, (match) => {
                modifiedCount++;
                return '"hasPermission":true';
            });
            
            if (modifiedCount > 0) {
                console.log(`✅ 成功修改 ${modifiedCount} 处 hasPermission 字段`);
                console.log(`📊 原始响应长度: ${originalBody.length} 字符`);
                console.log(`📊 修改后长度: ${body.length} 字符`);
            } else {
                console.log(`ℹ️  未找到需要修改的 hasPermission 字段`);
            }
            
            console.log(`========================================\n`);
            $done({ body });
        }
        
        // ===== 处理 mediafile/meta 接口请求 =====
        else if (url.match(/\/episodes\/[^/]+\/mediafile\/meta/) && isRequestHandler()) {
            console.log(`📝 处理类型: 请求拦截与重写`);
            console.log(`🎯 目标: 使用存储Cookie重新请求`);
            
            // 获取存储的Cookie
            const savedCookie = $prefs.valueForKey(COOKIE_KEY);
            
            if (!savedCookie) {
                console.log(`❌ 错误: 未找到存储的Cookie (${COOKIE_KEY})`);
                console.log(`💡 提示: 请先运行登录脚本获取Cookie`);
                console.log(`========================================\n`);
                $done({});
                return;
            }
            
            console.log(`✅ 成功获取存储的Cookie`);
            console.log(`📝 Cookie长度: ${savedCookie.length} 字符`);
            
            // 提取episode ID（用于日志）
            const match = url.match(/\/episodes\/([^/]+)\/mediafile\/meta/);
            const episodeId = match ? match[1] : 'unknown';
            console.log(`📦 Episode ID: ${episodeId}`);
            
            // 构建新的请求
            const requestOptions = {
                url: url,
                headers: {
                    'Cookie': savedCookie,
                    'User-Agent': $request.headers['User-Agent'] || 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                    'Accept': $request.headers['Accept'] || 'application/json',
                    'Accept-Language': $request.headers['Accept-Language'] || 'zh-CN,zh;q=0.9',
                    'Accept-Encoding': $request.headers['Accept-Encoding'] || 'gzip, deflate, br',
                }
            };
            
            console.log(`🌐 发起新请求...`);
            
            try {
                const response = await httpRequest(requestOptions);
                
                console.log(`📥 收到响应`);
                console.log(`📊 状态码: ${response.statusCode}`);
                console.log(`📊 响应长度: ${response.body ? response.body.length : 0} 字符`);
                
                if (response.statusCode === 200 && response.body) {
                    // 尝试解析JSON以验证响应有效性
                    try {
                        const jsonData = JSON.parse(response.body);
                        console.log(`✅ 响应JSON解析成功`);
                        
                        // 显示部分响应内容（用于调试）
                        const preview = response.body.length > 100 
                            ? response.body.substring(0, 100) + '...' 
                            : response.body;
                        console.log(`🔍 响应预览: ${preview}`);
                        
                        console.log(`✅ 成功替换原请求响应`);
                        console.log(`========================================\n`);
                        
                        // 返回新的响应
                        $done({
                            response: {
                                status: 200,
                                headers: response.headers,
                                body: response.body
                            }
                        });
                    } catch (parseError) {
                        console.log(`⚠️  警告: JSON解析失败，但仍返回响应`);
                        console.log(`========================================\n`);
                        
                        $done({
                            response: {
                                status: 200,
                                headers: response.headers,
                                body: response.body
                            }
                        });
                    }
                } else {
                    console.log(`❌ 请求失败或响应为空`);
                    console.log(`📊 状态码: ${response.statusCode}`);
                    console.log(`========================================\n`);
                    
                    // 返回原始请求
                    $done({});
                }
            } catch (error) {
                console.log(`❌ 请求发生错误: ${error}`);
                console.log(`========================================\n`);
                
                // 返回原始请求
                $done({});
            }
        }
        
        // ===== 未匹配的情况 =====
        else {
            console.log(`ℹ️  未匹配到处理规则`);
            console.log(`========================================\n`);
            
            if (isResponseHandler()) {
                $done({ body: $response.body });
            } else {
                $done({});
            }
        }
    } catch (error) {
        console.log(`❌ 脚本执行错误: ${error}`);
        console.log(`========================================\n`);
        
        if (isResponseHandler()) {
            $done({ body: $response.body });
        } else {
            $done({});
        }
    }
})();

