/*
粉笔登录 Cookie 获取脚本 V2
// 粉笔网Cookie获取脚本
[rewrite_local]
// 或者直接使用script-request-header
^https:\/\/ke\.fenbi\.com\/iphone\/v3\/user_orders\/my url script-request-header https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi_login_v2.js
*/

// fenbi-cookie.js
const url = $request.url;
const headers = $request.headers;

if (headers.Cookie) {
    // 提取Cookie
    const cookie = headers.Cookie;
    
    // 存储到Quantumult X的持久化存储
    $prefs.setValueForKey(cookie, "fenbi_cookie");
    
    // 通知用户获取成功
    $notify("粉笔网Cookie获取成功", "", "Cookie已保存到fenbi_cookie");
    
    console.log("粉笔网Cookie: " + cookie);
} else {
    $notify("粉笔网Cookie获取失败", "", "未找到Cookie信息");
}

$done({});