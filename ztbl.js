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
  "data": "cc4def8ec21cc628e22bd23b75fd88a611763fdc758a15814b6b016d77ec4832ddf1e39e2fde9d00ccc7d9a4f2978b2946fe24f9c79a9fd3f967dea460c31d94a656fc098f1cf436e78ce2a76a95d7770d9a654f5be961a83450459454787db9f889724e68439f8c00f88e31762a60ada0851c073b6526930b77c8098ee85d33334ba6d9107d14c690db18a2acaaf94b606959a18685648c5b051c057ef2d50074fadf490e2cf59deae23436657e31894e3d6418b2b70bfd0c5f21eeed9bacb352aa963585a67fcc617d8408e6b89d3cd3a39a805a8970b58c684b04b522049982fd6bbe198f3519b5392a77c9565258"
}


$done({body : JSON.stringify(objc)});
