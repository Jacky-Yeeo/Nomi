/**
 * BytePlus AK/SK 签名（AWS Signature V4 兼容）。BytePlus IAM 鉴权用于 Asset API 等控制面接口。
 *
 * 签名流程：
 *   1. 构建规范请求 (canonical request)
 *   2. 构建待签字符串 (string to sign)
 *   3. 用 SK 逐层 HMAC 计算签名密钥
 *   4. 签名 → Authorization 头
 *
 * 参考：https://docs.byteplus.com/en/docs/byteplus-platform/apply-for-access-key
 */

import crypto from "node:crypto";

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

export interface ByteplusSignOptions {
  accessKey: string;
  secretKey: string;
  region: string;
  service: string;
  method: string;
  path: string;
  query?: string;
  body: string;
  headers: Record<string, string>;
}

export interface ByteplusSignedHeaders {
  Authorization: string;
  "X-Date": string;
  "Content-Type": string;
  "X-Content-Sha256": string;
}

/**
 * 签一份 BytePlus API 请求。返回可直接 merge 进 fetch headers 的对象。
 */
export function signByteplusRequest(opts: ByteplusSignOptions): ByteplusSignedHeaders {
  const { accessKey, secretKey, region, service, method, path, query, body, headers } = opts;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const xDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";

  const payloadHash = sha256Hex(body);

  // 规范请求头 —— 按 key 字母序
  const signedHeaderKeys = Object.keys({ ...headers, "x-date": xDate, "x-content-sha256": payloadHash })
    .map((k) => k.toLowerCase())
    .sort();
  const canonicalHeaders = signedHeaderKeys
    .map((k) => {
      const v = k === "x-date" ? xDate : k === "x-content-sha256" ? payloadHash : (headers[k] ?? "");
      return `${k}:${String(v).trim()}\n`;
    })
    .join("");
  const signedHeaders = signedHeaderKeys.join(";");

  // 规范请求
  const canonicalUri = path || "/";
  const canonicalQuery = query ?? "";
  const canonicalRequest = [method.toUpperCase(), canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");

  // 待签字符串
  const credentialScope = `${dateStamp}/${region}/${service}/request`;
  const stringToSign = ["HMAC-SHA256", xDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  // 逐层 HMAC 计算签名密钥
  const kDate = hmacSha256(`HMAC${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "request");
  const signature = hmacSha256(kSigning, stringToSign).toString("hex");

  return {
    Authorization: `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "X-Date": xDate,
    "Content-Type": headers["content-type"] ?? "application/json",
    "X-Content-Sha256": payloadHash,
  };
}
