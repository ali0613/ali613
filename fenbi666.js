/*
 * Quantumult X 粉笔网权限重写脚本
 * 功能：
 * 1. 修改 question_episodes_with_multi_type 接口响应，解锁权限
 * 2. 等待 mediafile/meta 接口原始响应后，用存储的cookie重新请求并替换响应
 * 
 * 使用方法：
 * [rewrite_local]
 * # 响应重写 - 修改权限
 * ^https?:\/\/ke\.fenbi\.com\/iphone\/gwy\/v3\/episodes\/question_episodes_with_multi_type url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi666.js
 * 
 * # 响应重写 - 等待原始响应后，用新cookie重新请求并替换
 * ^https?:\/\/ke\.fenbi\.com\/iphone\/gwy\/v3\/episodes\/[^/]+\/mediafile\/meta url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi666.js
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

// ===== 处理 mediafile/meta 接口响应 =====
else if (url.match(/\/episodes\/[^/]+\/mediafile\/meta/) && typeof $response !== 'undefined') {
    console.log(`📝 处理类型: 响应替换`);
    console.log(`🎯 目标: 等待原始响应后，用存储Cookie重新请求并替换`);
    
    // 记录原始响应信息
    const originalBody = $response.body;
    console.log(`📦 原始响应长度: ${originalBody ? originalBody.length : 0} 字符`);
    
    // 获取存储的Cookie
    const savedCookie = $prefs.valueForKey(COOKIE_KEY);
    
    if (!savedCookie) {
        console.log(`❌ 错误: 未找到存储的Cookie (${COOKIE_KEY})`);
        console.log(`💡 提示: 请先运行登录脚本获取Cookie`);
        console.log(`⚠️  返回原始响应`);
        console.log(`========================================\n`);
        $done({ body: originalBody });
    } else {
        console.log(`✅ 成功获取存储的Cookie`);
        console.log(`📝 Cookie长度: ${savedCookie.length} 字符`);
        
        // 提取episode ID（用于日志）
        const match = url.match(/\/episodes\/([^/]+)\/mediafile\/meta/);
        const episodeId = match ? match[1] : 'unknown';
        console.log(`📦 Episode ID: ${episodeId}`);
        
        // 构建新的请求选项
        const requestOptions = {
            url: url,
            method: 'GET',
            headers: {
                'Cookie': savedCookie,
                'User-Agent': $request.headers['User-Agent'] || 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Accept': $request.headers['Accept'] || '*/*',
                'Accept-Language': $request.headers['Accept-Language'] || 'zh-CN,zh;q=0.9',
                'Referer': 'https://ke.fenbi.com/',
            }
        };
        
        console.log(`🌐 使用新Cookie发起请求...`);
        console.log(`📋 请求方法: GET`);
        console.log(`🔗 完整URL: ${url}`);
        
        // 使用 $task.fetch 发起新请求
        $task.fetch(requestOptions).then(
            response => {
                console.log(`📥 收到新请求的响应`);
                console.log(`📊 状态码: ${response.statusCode}`);
                
                if (response.body) {
                    console.log(`📊 新响应长度: ${response.body.length} 字符`);
                    
                    // 显示部分响应内容（用于调试）
                    const preview = response.body.length > 100 
                        ? response.body.substring(0, 100) + '...' 
                        : response.body;
                    console.log(`🔍 新响应预览: ${preview}`);
                    
                    if (response.statusCode === 200) {
                        console.log(`✅ 成功用新响应替换原始响应`);
                        console.log(`========================================\n`);
                        
                        // 返回新响应的body
                        $done({ body: response.body });
                    } else {
                        console.log(`⚠️  新请求状态码非200，返回原始响应`);
                        console.log(`========================================\n`);
                        
                        // 状态码不是200，返回原始响应
                        $done({ body: originalBody });
                    }
                } else {
                    console.log(`❌ 新响应体为空，返回原始响应`);
                    console.log(`========================================\n`);
                    
                    // 新响应为空，返回原始响应
                    $done({ body: originalBody });
                }
            },
            reason => {
                console.log(`❌ 新请求失败: ${reason}`);
                console.log(`📝 失败原因: ${JSON.stringify(reason)}`);
                console.log(`⚠️  返回原始响应`);
                console.log(`========================================\n`);
                
                // 请求失败，返回原始响应
                $done({ body: originalBody });
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
