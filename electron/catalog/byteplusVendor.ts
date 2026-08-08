// BytePlus（火山引擎海外版）供应商种子。
// 与 volcengineVendor 同源（都是 ModelArk），但分属不同区域：
//   - 火山方舟：ark.cn-beijing.volces.com（中国区）
//   - BytePlus：ark.ap-southeast.bytepluses.com（海外区）
// 模型同一套（Seedance 2.0 / Seedream），但 key 不互通（区域隔离）。
// 认证：Bearer API key，从 BytePlus 控制台获取。
export const BYTEPLUS_VENDOR_SEED = {
  key: "byteplus",
  name: "BytePlus",
  baseUrl: "https://ark.ap-southeast.bytepluses.com",
  authType: "bearer" as const,
  authHeader: "Authorization",
} as const;
