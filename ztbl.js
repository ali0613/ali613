/******************************

脚本功能：真题伴侣一解锁VIP

*******************************

[rewrite_local]

http:\/\/newtest\.zoooy111\.com\/mobilev2\.php\/User\/index url script-response-body https://raw.githubusercontent.com/ali0613/ali613/refs/heads/main/ztbl.js

[mitm] 

hostname = newtest.zoooy111.com,newtest.zoooy111.com
mobilev2.php




*******************************/

var objc = JSON.parse($response.body);

    objc = 
{
  "success": 1,
  "data": "7f6b79a5f234bf8a3a5bd62ec01f0a45667d8e495d7e57a6fa55f748d23afde065bd935050ce994889307200fed0bb1f577ebb06bee63fbf62a483753ecc1269fc88edaa520742228f50355c9b81108c49c473fddff2f7741831a30bea65d88092cc2eb2b0ece9143674d0a3f57ca50a34287087b70ad2aaeb3ab54070a78067a4748dabfd46058278ac4efd3168d9f3cec3fd849c21a089e3b9495747b48ad2f179667e5814500bdd7099f022be22bd6fc5921c1aa30b5f8de2b9e4a745c48dcd7ff3b827ce04de1e5306618928aa175fe007dab7a091106098eb9958ca64e9"
}


$done({body : JSON.stringify(objc)});
