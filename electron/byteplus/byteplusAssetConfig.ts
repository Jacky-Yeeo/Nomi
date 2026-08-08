/**
 * BytePlus Asset API 凭证加载。
 *
 * AK/SK 优先从环境变量读取（BYTEPLUS_ACCESS_KEY / BYTEPLUS_SECRET_KEY），
 * 也支持显式传入（IPC / 设置面板）。
 */

export interface ByteplusAssetCredentials {
  accessKey: string;
  secretKey: string;
  projectName: string;
}

const ENV_KEY_MAP = [
  ["BYTEPLUS_ACCESS_KEY", "BYTEPLUS_SECRET_KEY"],
  ["VOLCANO_ACCESS_KEY", "VOLCANO_SECRET_KEY"],
] as const;

function readEnvPair(ak: string, sk: string): ByteplusAssetCredentials | null {
  const accessKey = process.env[ak]?.trim();
  const secretKey = process.env[sk]?.trim();
  if (accessKey && secretKey) {
    return { accessKey, secretKey, projectName: process.env.BYTEPLUS_PROJECT_NAME?.trim() || "default" };
  }
  return null;
}

/** 从环境变量加载 BytePlus AK/SK 凭证。按优先级试多组变量名。 */
export function loadAssetCredentials(): ByteplusAssetCredentials | null {
  for (const [ak, sk] of ENV_KEY_MAP) {
    const cred = readEnvPair(ak, sk);
    if (cred) return cred;
  }
  return null;
}

/** 校验凭证是否完整。 */
export function validateCredentials(cred: ByteplusAssetCredentials): void {
  if (!cred.accessKey?.trim()) throw new Error("BytePlus: BYTEPLUS_ACCESS_KEY is required");
  if (!cred.secretKey?.trim()) throw new Error("BytePlus: BYTEPLUS_SECRET_KEY is required");
}
