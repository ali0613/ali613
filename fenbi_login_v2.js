/*
粉笔登录 Cookie 获取脚本 V2
// 粉笔网Cookie获取脚本
[rewrite_local]
// 或者直接使用script-request-header
^https:\/\/ke\.fenbi\.com\/iphone\/v3\/user_orders\/my url script-request-header https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/fenbi_login_v2.js

[mitm]
hostname = ke.fenbi.com
*/

// fenbi-cookie.js
// 粉笔网Cookie获取及会员领取脚本 V2
const url = $request.url;
const headers = $request.headers;

if (headers.Cookie) {
    // 提取Cookie
    const cookie = headers.Cookie;
    
    // 存储到Quantumult X的持久化存储
    $prefs.setValueForKey(cookie, "fenbi_cookie");
    
    console.log("粉笔网Cookie: " + cookie);
    
    // 使用保存的Cookie发送领取会员的请求
    claimMemberships(cookie);
} else {
    $notify("粉笔网Cookie获取失败", "", "未找到Cookie信息");
    $done({});
}

function claimMemberships(cookie) {
    let successCount = 0;
    let totalCount = 2;
    
    // 领取行测VIP (content_id=800274)
    claimVIPMember(cookie, "800274", "8", "行测VIP", function() {
        successCount++;
        checkCompletion(successCount, totalCount);
    });
    
    // 领取行测SVIP (content_id=3008699)
    claimVIPMember(cookie, "3008699", "8", "行测SVIP", function() {
        successCount++;
        checkCompletion(successCount, totalCount);
    });
}

function claimVIPMember(cookie, contentId, contentType, memberType, callback) {
    const claimUrl = "https://ke.fenbi.com/iphone/v3/user_member/draw_trail_member";
    
    const postData = `content_id=${contentId}&content_type=${contentType}`;
    
    const requestOptions = {
        url: claimUrl,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookie,
            "User-Agent": "XC/6.17.75 (iPhone; iOS 16.1.1; Scale/3.00)",
            "Accept": "*/*",
            "Accept-Language": "zh-Hans-CN;q=1, en-CN;q=0.9",
            "Connection": "keep-alive"
        },
        body: postData
    };
    
    $task.fetch(requestOptions).then(response => {
        try {
            const result = JSON.parse(response.body);
            if (result.code === 1) {
                console.log(`✅ ${memberType} 领取成功`);
                callback(true);
            } else {
                console.log(`❌ ${memberType} 领取失败: ${result.msg || "未知错误"}`);
                callback(false);
            }
        } catch (e) {
            console.log(`❌ ${memberType} 请求解析失败: ${e}`);
            callback(false);
        }
    }, reason => {
        console.log(`❌ ${memberType} 网络请求失败: ${reason.error}`);
        callback(false);
    });
}

function checkCompletion(successCount, totalCount) {
    if (successCount === totalCount) {
        $notify(
            "🎉 粉笔网会员领取完成", 
            `成功领取 ${successCount}/${totalCount} 个会员`,
            "请前往粉笔APP查看会员状态"
        );
    }
}

$done({});