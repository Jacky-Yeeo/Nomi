/**
 * BytePlus Asset API IPC 桥 —— 暴露资产库操作给渲染进程。
 *
 * 通道：
 *   - byteplus:asset:createGroup   → 创建资产组
 *   - byteplus:asset:createAsset    → 上传资产
 *   - byteplus:asset:listAssets     → 列出资产
 *   - byteplus:asset:getAsset       → 获取单个资产
 *   - byteplus:asset:deleteAsset    → 删除资产
 *   - byteplus:asset:listGroups     → 列出资产组
 *   - byteplus:asset:getGroup       → 获取资产组
 */

import { ipcMain } from "electron";
import { loadAssetCredentials, validateCredentials } from "./byteplusAssetConfig";
import * as Asset from "./byteplusAssetClient";
import type { AssetApiConfig } from "./byteplusAssetClient";

function resolveConfig(): AssetApiConfig {
  const cred = loadAssetCredentials();
  validateCredentials(cred!);
  return cred!;
}

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

function fail(error: unknown): IpcResult<never> {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: message };
}

export function registerByteplusAssetIpc(): void {
  ipcMain.handle("byteplus:asset:createGroup", async (_e, name: string, description?: string) => {
    try {
      const group = await Asset.createAssetGroup(resolveConfig(), name, description);
      return ok(group);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle("byteplus:asset:createAsset", async (_e, groupId: string, url: string, assetType: "Image" | "Video" | "Audio", name?: string) => {
    try {
      const asset = await Asset.createAsset(resolveConfig(), groupId, url, assetType, name);
      return ok(asset);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle("byteplus:asset:listAssets", async (_e, groupId: string, page?: number, pageSize?: number) => {
    try {
      const result = await Asset.listAssets(resolveConfig(), groupId, page, pageSize);
      return ok(result);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle("byteplus:asset:getAsset", async (_e, assetId: string) => {
    try {
      const asset = await Asset.getAsset(resolveConfig(), assetId);
      return ok(asset);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle("byteplus:asset:deleteAsset", async (_e, assetId: string) => {
    try {
      const result = await Asset.deleteAsset(resolveConfig(), assetId);
      return ok(result);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle("byteplus:asset:listGroups", async (_e, page?: number, pageSize?: number) => {
    try {
      const result = await Asset.listAssetGroups(resolveConfig(), page, pageSize);
      return ok(result);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle("byteplus:asset:getGroup", async (_e, groupId: string) => {
    try {
      const group = await Asset.getAssetGroup(resolveConfig(), groupId);
      return ok(group);
    } catch (e) { return fail(e); }
  });
}
