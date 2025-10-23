/*
 * Quantumult X 粉笔网权限重写脚本
 * 功能：
 * 1. 修改 question_episodes_with_multi_type 接口响应，解锁权限
 * 2. 拦截 mediafile/meta 接口，使用存储的cookie重新请求
 * 
 * 使用方法：
 * [rewrite_local]
 * # 响应重写 - 修改权限
 * ^https?:\/\/ke\.fenbi\.com\/iphone\/gwy\/v3\/episodes\/question_episodes_with_multi_type url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi.js
 * 
 * # 请求重写 - 替换响应
 * ^https?:\/\/ke\.fenbi\.com\/iphone\/gwy\/v3\/episodes\/[^/]+\/mediafile\/meta url script-request-header https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi.js
 * 
 * [mitm]
 * hostname = ke.fenbi.com
 */

// ==================== 配置区域 ====================

const COOKIE_KEY = 'fenbi_cookie'; // 存储Cookie的键名

// ==================== 主程序 ====================

const url = $request.url;

console.log(`\n========================================`);
console.log(`🔄 粉笔网权限重写脚本`);
console.log(`📍 请求URL: ${url}`);
console.log(`========================================\n`);

// ===== 处理 question_episodes_with_multi_type 接口响应 =====
if (url.includes('/question_episodes_with_multi_type') && typeof $response !== 'undefined') {
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
else if (url.match(/\/episodes\/[^/]+\/mediafile\/meta/)) {
    console.log(`📝 处理类型: 请求拦截与重写`);
    console.log(`🎯 目标: 使用存储Cookie重新请求`);
    
    // 获取存储的Cookie
    const savedCookie = $prefs.valueForKey(COOKIE_KEY);
    
    if (!savedCookie) {
        console.log(`❌ 错误: 未找到存储的Cookie (${COOKIE_KEY})`);
        console.log(`💡 提示: 请先运行登录脚本获取Cookie`);
        console.log(`========================================\n`);
        $done({});
    } else {
        console.log(`✅ 成功获取存储的Cookie`);
        console.log(`📝 Cookie长度: ${savedCookie.length} 字符`);
        
        // 提取episode ID（用于日志）
        const match = url.match(/\/episodes\/([^/]+)\/mediafile\/meta/);
        const episodeId = match ? match[1] : 'unknown';
        console.log(`📦 Episode ID: ${episodeId}`);
        
        // 获取原始请求的查询参数
        const urlObj = new URL(url);
        const fullUrl = url;
        
        // 构建新的请求选项
        const requestOptions = {
            url: fullUrl,
            method: 'GET',
            headers: {
                'Cookie': savedCookie,
                'User-Agent': $request.headers['User-Agent'] || 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Accept': $request.headers['Accept'] || '*/*',
                'Accept-Language': $request.headers['Accept-Language'] || 'zh-CN,zh;q=0.9',
                'Referer': 'https://ke.fenbi.com/',
            }
        };
        
        console.log(`🌐 发起新请求...`);
        console.log(`📋 请求方法: GET`);
        console.log(`🔗 完整URL: ${fullUrl}`);
        
        // 使用 $task.fetch 发起请求
        $task.fetch(requestOptions).then(
            response => {
                console.log(`📥 收到响应`);
                console.log(`📊 状态码: ${response.statusCode}`);
                
                if (response.body) {
                    console.log(`📊 响应长度: ${response.body.length} 字符`);
                    
                    // 显示部分响应内容（用于调试）
                    const preview = response.body.length > 100 
                        ? response.body.substring(0, 100) + '...' 
                        : response.body;
                    console.log(`🔍 响应预览: ${preview}`);
                    
                    if (response.statusCode === 200) {
                        console.log(`✅ 成功替换原请求响应`);
                        console.log(`========================================\n`);
                        
                        // 返回新的响应
                        $done({
                            response: {
                                status: response.statusCode,
                                headers: response.headers || {},
                                body: response.body
                            }
                        });
                    } else {
                        console.log(`⚠️  状态码非200，但仍返回响应`);
                        console.log(`========================================\n`);
                        
                        $done({
                            response: {
                                status: response.statusCode,
                                headers: response.headers || {},
                                body: response.body
                            }
                        });
                    }
                } else {
                    console.log(`❌ 响应体为空`);
                    console.log(`========================================\n`);
                    
                    // 响应为空，继续原始请求
                    $done({});
                }
            },
            reason => {
                console.log(`❌ 请求失败: ${reason}`);
                console.log(`📝 失败原因: ${JSON.stringify(reason)}`);
                console.log(`========================================\n`);
                
                // 请求失败，继续原始请求
                $done({});
            }
        );
    }
}

// ===== 未匹配的情况 =====
else {
    console.log(`ℹ️  未匹配到处理规则`);
    console.log(`========================================\n`);
    
    if (typeof $response !== 'undefined') {
        $done({ body: $response.body });
    } else {
        $done({});
    }
}

