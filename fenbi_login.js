/*
粉笔登录 Cookie 获取脚本 V2
适用于 Quantumult X - 使用原始响应提取

使用说明：
1. 在 Quantumult X 配置中添加重写规则：
   [rewrite_local]
   ^https:\/\/login\.fenbi\.com\/iphone\/users\/quicklogin url script-response-header https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi_login.js

2. 添加 MITM 主机名：
   [mitm]
   hostname = login.fenbi.com

3. 开启重写和 MITM 后，进行登录操作即可自动获取 Cookie
*/

const cookieName = '粉笔';
const cookieKey = 'fenbi_cookie';

// 注意：这个版本使用 script-response-header 而不是 script-response-body
// 因为我们只需要处理响应头

// 获取响应状态码
let statusCode = $response.statusCode || $response.status;
console.log('粉笔: 响应状态码 =>', statusCode);

if (statusCode === 200) {
    // 获取响应头
    let headers = $response.headers;
    
    console.log('粉笔: 开始处理响应头');
    console.log('粉笔: 响应头对象类型 =>', typeof headers);
    console.log('粉笔: 响应头键名 =>', Object.keys(headers || {}).join(', '));
    
    // 提取 Set-Cookie 信息
    let cookies = {};
    let cookieCount = 0;
    
    // 遍历所有响应头键
    for (let key in headers) {
        let lowerKey = key.toLowerCase();
        
        // 查找所有包含 'cookie' 的键
        if (lowerKey.includes('cookie')) {
            console.log(`粉笔: 找到 Cookie 相关头 => ${key}`);
            let value = headers[key];
            
            console.log(`粉笔: 值类型 => ${typeof value}`);
            console.log(`粉笔: 是否为数组 => ${Array.isArray(value)}`);
            
            if (Array.isArray(value)) {
                // 如果是数组，遍历每个元素
                console.log(`粉笔: 数组长度 => ${value.length}`);
                value.forEach((cookieStr, idx) => {
                    console.log(`粉笔: [${idx}] Cookie => ${cookieStr}`);
                    extractCookie(cookieStr, cookies);
                    cookieCount++;
                });
            } else if (typeof value === 'string') {
                // 如果是字符串，可能包含多个 Cookie
                console.log(`粉笔: Cookie 字符串长度 => ${value.length}`);
                console.log(`粉笔: Cookie 字符串前200字符 => ${value.substring(0, 200)}`);
                
                // 尝试多种分隔符
                let cookieArray = [];
                if (value.includes('\n')) {
                    cookieArray = value.split('\n');
                    console.log('粉笔: 使用换行符分割');
                } else if (value.includes(',')) {
                    // 有些服务器可能用逗号分隔（虽然不标准）
                    cookieArray = value.split(',');
                    console.log('粉笔: 使用逗号分割');
                } else {
                    cookieArray = [value];
                    console.log('粉笔: 单个 Cookie');
                }
                
                cookieArray.forEach((cookieStr, idx) => {
                    if (cookieStr.trim()) {
                        console.log(`粉笔: [${idx}] Cookie => ${cookieStr.trim()}`);
                        extractCookie(cookieStr.trim(), cookies);
                        cookieCount++;
                    }
                });
            }
        }
    }
    
    console.log(`粉笔: 共处理 ${cookieCount} 个 Cookie 字段`);
    console.log('粉笔: 最终提取的 Cookies =>', JSON.stringify(cookies));
    
    // 按照指定格式拼接 Cookie
    if (cookies.sid && cookies.userid && cookies.sess && cookies.persistent) {
        let cookieValue = `sid=${cookies.sid}; userid=${cookies.userid}; sess=${cookies.sess}; persistent=${cookies.persistent}; `;
        
        // 保存到本地存储
        $persistentStore.write(cookieValue, cookieKey);
        
        console.log(`${cookieName}: Cookie 获取成功 ✅`);
        console.log(`${cookieName}: Cookie 内容 => ${cookieValue}`);
        
        $notify(cookieName, 'Cookie 获取成功', `用户ID: ${cookies.userid}`);
    } else {
        console.log(`${cookieName}: Cookie 信息不完整`);
        console.log(`${cookieName}: 缺少字段 => sid:${!!cookies.sid}, userid:${!!cookies.userid}, sess:${!!cookies.sess}, persistent:${!!cookies.persistent}`);
        
        $notify(cookieName, 'Cookie 获取失败', 'Cookie 信息不完整，请查看日志');
    }
} else {
    console.log(`${cookieName}: 响应状态码不是 200 => ${statusCode}`);
}

// 提取单个 Cookie 的函数
function extractCookie(cookieStr, cookies) {
    // 提取 cookie 键值对（只取第一个分号之前的部分）
    let match = cookieStr.match(/^([^=]+)=([^;]+)/);
    if (match) {
        let key = match[1].trim();
        let value = match[2].trim();
        
        console.log(`粉笔: 提取 => ${key} = ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
        
        // 只保存需要的字段
        if (['sid', 'userid', 'sess', 'persistent'].includes(key)) {
            // 跳过空值的 cookie
            if (value && value !== '') {
                cookies[key] = value;
                console.log(`粉笔: ✓ 保存 ${key}`);
            } else {
                console.log(`粉笔: ✗ 跳过空值 ${key}`);
            }
        }
    } else {
        console.log(`粉笔: ✗ 无法匹配格式 => ${cookieStr.substring(0, 50)}`);
    }
}

// 返回原始响应
$done({});

