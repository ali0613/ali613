/*
 * Quantumult X 粉笔网权限重写脚本
 * 功能：
 * 1. 修改 question_episodes_with_multi_type 接口响应，解锁权限
 * 2. 等待 mediafile/meta 接口原始响应后，用存储的cookie重新请求并替换响应
 * 3. 等待 article/list 接口原始响应后，用存储的cookie重新请求并替换响应
 * 4. 等待 article/summary 接口原始响应后，用存储的cookie重新请求并替换响应
 * 5. 替换 members/my 接口响应为固定权限数据
 * 
 * 使用方法：
 [rewrite_local]
 * # 响应重写 - 修改权限
 ^https?:\/\/ke\.fenbi\.com\/iphone\/gwy\/v3\/episodes\/question_episodes_with_multi_type url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi666.js
 * 
 * # 响应重写 - 等待原始响应后，用新cookie重新请求并替换
 ^https?:\/\/ke\.fenbi\.com\/iphone\/gwy\/v3\/episodes\/[^/]+\/mediafile\/meta url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi666.js
 * 
 * # 响应重写 - article/list 用新cookie重新请求并替换
 ^https?:\/\/hera-webapp\.fenbi\.com\/iphone\/member\/article\/list url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi666.js
 * 
 * # 响应重写 - article/summary 用新cookie重新请求并替换
 ^https?:\/\/hera-webapp\.fenbi\.com\/iphone\/article\/summary url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi666.js
 * 
 * # 响应重写 - members/my 固定权限数据
 ^https?:\/\/ke\.fenbi\.com\/iphone\/v3\/members\/my url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi666.js
 * 
 [mitm]
 hostname = ke.fenbi.com, hera-webapp.fenbi.com
 */

// ==================== 配置区域 ====================

const COOKIE_KEY = 'fenbi_cookie'; // 存储Cookie的键名

// ==================== 通用函数 ====================

// 使用存储的Cookie重新请求接口
function fetchWithSavedCookie(url, originalBody) {
    const savedCookie = $prefs.valueForKey(COOKIE_KEY);
    
    if (!savedCookie) {
        console.log(`未找到Cookie，返回原始响应`);
        $done({ body: originalBody });
        return;
    }
    
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
    
    console.log(`使用Cookie重新请求...`);
    
    $task.fetch(requestOptions).then(
        response => {
            if (response.statusCode === 200 && response.body) {
                console.log(`请求成功，已替换响应`);
                $done({ body: response.body });
            } else {
                console.log(`请求失败(状态码:${response.statusCode})，返回原始响应`);
                $done({ body: originalBody });
            }
        },
        reason => {
            console.log(`请求出错: ${reason}，返回原始响应`);
            $done({ body: originalBody });
        }
    );
}

// ==================== 主程序 ====================

const url = $request.url;

console.log(`\n[粉笔重写] ${url}`);

// ===== 处理 question_episodes_with_multi_type 接口响应 =====
if (url.includes('/question_episodes_with_multi_type') && typeof $response !== 'undefined') {
    console.log(`处理类型: 权限修改`);
    
    let body = $response.body;
    let modifiedCount = 0;
    
    body = body.replace(/"hasPermission"\s*:\s*false/g, (match) => {
        modifiedCount++;
        return '"hasPermission":true';
    });
    
    if (modifiedCount > 0) {
        console.log(`已修改 ${modifiedCount} 处权限字段\n`);
    } else {
        console.log(`无需修改\n`);
    }
    
    $done({ body });
}

// ===== 处理 mediafile/meta 接口响应 =====
else if (url.match(/\/episodes\/[^/]+\/mediafile\/meta/) && typeof $response !== 'undefined') {
    console.log(`处理类型: Cookie重新请求`);
    fetchWithSavedCookie(url, $response.body);
}

// ===== 处理 article/list 接口响应 =====
else if (url.includes('hera-webapp.fenbi.com') && url.includes('/article/list') && typeof $response !== 'undefined') {
    console.log(`处理类型: Cookie重新请求`);
    fetchWithSavedCookie(url, $response.body);
}

// ===== 处理 article/summary 接口响应 =====
else if (url.includes('hera-webapp.fenbi.com') && url.includes('/article/summary') && typeof $response !== 'undefined') {
    console.log(`处理类型: Cookie重新请求`);
    fetchWithSavedCookie(url, $response.body);
}

// ===== 处理 members/my 接口响应 =====
else if (url.includes('/members/my') && typeof $response !== 'undefined') {
    console.log(`处理类型: 固定权限替换`);
    const fixedResponse = '{"code":1,"msg":"","data":[1,55,2,52,5,0,11,59,4,57,13,63,70,0,7,0,8,61,16,0,12,0,14,0,17,0,15,0,21,0,6,0,19,0,18,0,20,67,53,0,32,0,50,0,30,0,31,0]}';
    console.log(`已替换为固定权限数据\n`);
    $done({ body: fixedResponse });
}

// ===== 未匹配的情况 =====
else {
    console.log(`未匹配到处理规则\n`);
    
    if (typeof $response !== 'undefined') {
        $done({ body: $response.body });
    } else {
        $done({});
    }
}
