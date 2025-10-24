/*
粉笔登录 Cookie 获取脚本
适用于 Quantumult X

使用说明：
1. 在 Quantumult X 配置中添加重写规则：
   [rewrite_local]
   ^https:\/\/login\.fenbi\.com\/iphone\/users\/quicklogin url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi_login.js

2. 添加 MITM 主机名：
   [mitm]
   hostname = login.fenbi.com

3. 开启重写和 MITM 后，进行登录操作即可自动获取 Cookie
*/

const cookieName = '粉笔';
const cookieKey = 'fenbi_cookie';

// 获取响应体
let body = $response.body;
let obj = null;

try {
    obj = JSON.parse(body);
} catch (e) {
    console.log('粉笔: 解析响应体失败');
    $done({});
}

// 检查响应 code 是否为 1（登录成功）
if (obj && obj.code === 1) {
    // 获取响应头
    let headers = $response.headers;
    
    // 调试：打印所有响应头
    console.log('粉笔: 响应头信息 =>', JSON.stringify(headers));
    
    // 提取 Set-Cookie 信息
    let cookies = {};
    
    // Quantumult X 中响应头的 Set-Cookie 可能是数组或字符串，且键名可能不同
    let setCookieHeader = headers['Set-Cookie'] || headers['set-cookie'] || headers['SET-COOKIE'];
    
    console.log('粉笔: Set-Cookie 类型 =>', typeof setCookieHeader);
    console.log('粉笔: Set-Cookie 内容 =>', JSON.stringify(setCookieHeader));
    
    if (setCookieHeader) {
        // 如果是字符串，转换为数组
        let setCookieArray = typeof setCookieHeader === 'string' 
            ? [setCookieHeader] 
            : setCookieHeader;
        
        // 遍历所有 Set-Cookie，提取需要的字段
        setCookieArray.forEach(cookieStr => {
            console.log('粉笔: 处理 Cookie 字符串 =>', cookieStr);
            
            // 提取 cookie 键值对（只取第一个分号之前的部分）
            let match = cookieStr.match(/^([^=]+)=([^;]+)/);
            if (match) {
                let key = match[1].trim();
                let value = match[2].trim();
                
                console.log(`粉笔: 提取到 ${key} = ${value}`);
                
                // 只保存需要的字段
                if (['sid', 'userid', 'sess', 'persistent'].includes(key)) {
                    // 跳过空值的 cookie（如 tourist）
                    if (value) {
                        cookies[key] = value;
                    }
                }
            }
        });
    } else {
        console.log('粉笔: 未找到 Set-Cookie 响应头');
    }
    
    console.log('粉笔: 最终提取的 Cookies =>', JSON.stringify(cookies));
    
    // 按照指定格式拼接 Cookie: sid; userid; sess; persistent
    if (cookies.sid && cookies.userid && cookies.sess && cookies.persistent) {
        let cookieValue = `sid=${cookies.sid}; userid=${cookies.userid}; sess=${cookies.sess}; persistent=${cookies.persistent}; `;
        
        // 保存到本地存储
        $persistentStore.write(cookieValue, cookieKey);
        
        console.log(`${cookieName}: Cookie 获取成功 ✅`);
        console.log(`${cookieName}: Cookie 内容 => ${cookieValue}`);
        
        // 使用 $notify 而不是 $notification.post
        $notify(cookieName, 'Cookie 获取成功', `用户ID: ${cookies.userid}`);
    } else {
        console.log(`${cookieName}: Cookie 信息不完整`);
        console.log(`${cookieName}: 获取到的 Cookie => ${JSON.stringify(cookies)}`);
        
        // 使用 $notify 而不是 $notification.post
        $notify(cookieName, 'Cookie 获取失败', 'Cookie 信息不完整，请查看日志');
    }
} else {
    console.log(`${cookieName}: 登录失败或响应 code 不为 1`);
    if (obj) {
        console.log(`${cookieName}: 响应 code => ${obj.code}`);
    }
}

// 返回原始响应
$done({});

