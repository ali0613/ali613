/*
 * Quantumult X 粉笔网Cookie重写脚本
 * 功能：自动替换请求中的Cookie，支持路径黑名单
 * 
 * 使用方法：
 * [rewrite_local]
 * ^https?:\/\/ke\.fenbi\.com\/ url script-request-header fenbi_cookie_rewrite.js
 * ^https?:\/\/hera-webapp\.fenbi\.com\/iphone\/ url script-request-header fenbi_cookie_rewrite.js
 * 
 * [mitm]
 * hostname = ke.fenbi.com, hera-webapp.fenbi.com
 */

// ==================== 配置区域 ====================

// ke.fenbi.com 的路径黑名单（这些路径不会被重写cookie）
const KE_FENBI_BLACKLIST = [
    // 静态资源
    '/static/',
    '/assets/',
    '/images/',
    '/css/',
    '/js/',
    '/fonts/',
    
    // 公共资源
    '/public/',
    '/resources/',
    '/favicon.ico',
    
    // 第三方服务
    '/analytics/',
    '/track/',
    '/log/',
    '/report/',
    
    // WebSocket连接
    '/ws/',
    '/websocket/',
    '/socket.io/',
    
    // 可能导致问题的接口（根据需要添加）
    // '/api/logout',
    // '/api/refresh',
    
    // 添加其他需要排除的路径...
];

// hera-webapp.fenbi.com 的路径黑名单（可选）
const HERA_WEBAPP_BLACKLIST = [
    // 静态资源
    '/static/',
    '/assets/',
    '/images/',
    
    // 添加其他需要排除的路径...
];

// ==================== 主程序 ====================

// 获取请求对象
const url = $request.url;
const headers = $request.headers || {};

console.log(`\n========================================`);
console.log(`🔄 粉笔网Cookie重写脚本`);
console.log(`📍 请求URL: ${url}`);
console.log(`========================================\n`);

// 检查是否在黑名单中
function isInBlacklist(url, blacklist) {
    for (let path of blacklist) {
        if (url.includes(path)) {
            console.log(`⚠️  路径在黑名单中: ${path}`);
            return true;
        }
    }
    return false;
}

// 判断URL属于哪个域名
let isKeFenbi = url.includes('ke.fenbi.com');
let isHeraWebapp = url.includes('hera-webapp.fenbi.com');

// 检查黑名单
if (isKeFenbi && isInBlacklist(url, KE_FENBI_BLACKLIST)) {
    console.log(`❌ ke.fenbi.com - 路径在黑名单中，跳过重写`);
    $done({ headers });
}

if (isHeraWebapp && isInBlacklist(url, HERA_WEBAPP_BLACKLIST)) {
    console.log(`❌ hera-webapp.fenbi.com - 路径在黑名单中，跳过重写`);
    $done({ headers });
}

// 获取保存的Cookie
const savedCookie = $prefs.valueForKey('fenbi_cookie');

if (!savedCookie) {
    console.log(`⚠️  警告: 未找到保存的Cookie (fenbi_cookie)`);
    console.log(`💡 提示: 请先运行登录脚本获取Cookie`);
    $done({ headers });
} else {
    console.log(`✅ 成功获取保存的Cookie`);
    console.log(`📝 Cookie长度: ${savedCookie.length} 字符`);
    
    // 显示Cookie的前50个字符（用于调试）
    const cookiePreview = savedCookie.length > 50 
        ? savedCookie.substring(0, 50) + '...' 
        : savedCookie;
    console.log(`🔍 Cookie预览: ${cookiePreview}`);
    
    // 替换或添加Cookie头
    const originalCookie = headers['Cookie'] || headers['cookie'] || '';
    
    if (originalCookie) {
        console.log(`🔄 替换原有Cookie`);
        console.log(`   原Cookie长度: ${originalCookie.length} 字符`);
    } else {
        console.log(`➕ 添加新Cookie`);
    }
    
    // 设置Cookie（注意大小写）
    headers['Cookie'] = savedCookie;
    headers['cookie'] = savedCookie;
    
    // 确定域名类型
    let domainType = '';
    if (isKeFenbi) {
        domainType = 'ke.fenbi.com';
    } else if (isHeraWebapp) {
        domainType = 'hera-webapp.fenbi.com';
    }
    
    console.log(`✅ Cookie已替换 - 域名: ${domainType}`);
    console.log(`========================================\n`);
    
    $done({ headers });
}

