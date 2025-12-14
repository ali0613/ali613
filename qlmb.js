/******************************
[rewrite_local]

^https?:\/\/api\.rc-backup\.com\/.+\/(receipts$|subscribers\/?(.*?)*$) url script-response-body https://github.com/ali0613/ali613/raw/main/qlmb.js

^https?:\/\/api\.rc-backup\.com\/.+\/(receipts$|subscribers\/?(.*?)*$) url script-request-header https://github.com/ali0613/ali613/raw/main/qlmb.js
[mitm] 

hostname = api.rc-backup.com

*******************************/

const py996 = {};
const py997 = JSON.parse(typeof $response != "undefined" && $response.body || null);

const name = "Premium";
const appid = "ql_year_12";

  
if (typeof $response == "undefined") {
  delete $request.headers["x-revenuecat-etag"];
  delete $request.headers["X-RevenueCat-ETag"];

  py996.headers = $request.headers;
} else if (py997 && py997.subscriber) {
  data = {
    "expires_date": "9999-09-09T09:09:09Z",
    "original_purchase_date": "2023-02-23T02:33:33Z",
    "purchase_date": "2023-02-23T02:33:33Z",
    "ownership_type": "PURCHASED",
    "store": "app_store"
  };

  py997.subscriber.subscriptions[(appid)] = data
  py997.subscriber.entitlements[(name)] = JSON.parse(JSON.stringify(data));
  py997.subscriber.entitlements[(name)].product_identifier = (appid);
  py996.body = JSON.stringify(py997);
}

$done(py996);