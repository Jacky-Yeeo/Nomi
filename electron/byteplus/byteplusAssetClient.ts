/**
 * BytePlus 私有形象库（Asset API）客户端。
 *
 * 用途：管理虚拟形象素材（图片/视频/音频），上传后可持久引用到 Seedance 生成中。
 * 鉴权：AK/SK（IAM Access Key），非模型推理用的 Bearer API Key。
 *
 * 所有端点均为 POST，路径在 /open/ 命名空间下。响应格式 { Id, Name, URL, Status, ... }。
 */

import { signByteplusRequest } from "./byteplusSigning";
import type { ByteplusSignedHeaders } from "./byteplusSigning";

const ASSET_BASE = "https://open.byteplusapi.com";

export interface AssetApiConfig {
  accessKey: string;
  secretKey: string;
  projectName?: string;
}

export interface AssetGroup {
  Id: string;
  Name: string;
  Description?: string;
  GroupType: "AIGC";
  ProjectName?: string;
  CreateTime?: string;
  UpdateTime?: string;
}

export interface Asset {
  Id: string;
  Name?: string;
  URL?: string;
  AssetType: "Image" | "Video" | "Audio";
  GroupId: string;
  Status: "Active" | "Processing" | "Failed";
  Error?: { Code: string; Message: string };
  ProjectName?: string;
  CreateTime?: string;
  UpdateTime?: string;
}

export interface ListResult<T> {
  Items: T[];
  TotalCount: number;
  PageNumber: number;
  PageSize: number;
}

export async function createAssetGroup(config: AssetApiConfig, name: string, description?: string): Promise<AssetGroup> {
  const body = JSON.stringify({ Name: name, Description: description ?? "", GroupType: "AIGC", ProjectName: config.projectName ?? "default" });
  const resp = await assetPost(config, "/open/CreateAssetGroup", body);
  return (await resp.json()) as AssetGroup;
}

export async function createAsset(config: AssetApiConfig, groupId: string, url: string, assetType: "Image" | "Video" | "Audio", name?: string): Promise<Asset> {
  const body = JSON.stringify({ GroupId: groupId, URL: url, AssetType: assetType, Name: name ?? "", ProjectName: config.projectName ?? "default" });
  const resp = await assetPost(config, "/open/CreateAsset", body);
  return (await resp.json()) as Asset;
}

export async function listAssetGroups(config: AssetApiConfig, page = 1, pageSize = 20): Promise<ListResult<AssetGroup>> {
  const body = JSON.stringify({ Filter: { GroupType: "AIGC" }, PageNumber: page, PageSize: pageSize, ProjectName: config.projectName ?? "default" });
  const resp = await assetPost(config, "/open/ListAssetGroups", body);
  return (await resp.json()) as ListResult<AssetGroup>;
}

export async function listAssets(config: AssetApiConfig, groupId: string, page = 1, pageSize = 20): Promise<ListResult<Asset>> {
  const body = JSON.stringify({ Filter: { GroupIds: [groupId], GroupType: "AIGC" }, PageNumber: page, PageSize: pageSize, ProjectName: config.projectName ?? "default" });
  const resp = await assetPost(config, "/open/ListAssets", body);
  return (await resp.json()) as ListResult<Asset>;
}

export async function getAsset(config: AssetApiConfig, assetId: string): Promise<Asset> {
  const body = JSON.stringify({ Id: assetId, ProjectName: config.projectName ?? "default" });
  const resp = await assetPost(config, "/open/GetAsset", body);
  return (await resp.json()) as Asset;
}

export async function deleteAsset(config: AssetApiConfig, assetId: string): Promise<{ Id: string }> {
  const body = JSON.stringify({ Id: assetId, ProjectName: config.projectName ?? "default" });
  const resp = await assetPost(config, "/open/DeleteAsset", body);
  return (await resp.json()) as { Id: string };
}

export async function getAssetGroup(config: AssetApiConfig, groupId: string): Promise<AssetGroup> {
  const body = JSON.stringify({ Id: groupId, ProjectName: config.projectName ?? "default" });
  const resp = await assetPost(config, "/open/GetAssetGroup", body);
  return (await resp.json()) as AssetGroup;
}

// ---------------------------------------------------------------------------
// 内部
// ---------------------------------------------------------------------------

const REGION = "ap-southeast";
const SERVICE = "open";

async function assetPost(config: AssetApiConfig, path: string, body: string): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const signedHeaders: ByteplusSignedHeaders = signByteplusRequest({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: REGION,
    service: SERVICE,
    method: "POST",
    path,
    body,
    headers,
  });

  const resp = await fetch(`${ASSET_BASE}${path}`, {
    method: "POST",
    headers: { ...headers, ...signedHeaders },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`BytePlus Asset API error ${resp.status}: ${text}`);
  }
  return resp;
}
