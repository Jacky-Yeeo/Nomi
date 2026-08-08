import type { ModelParameterControl } from "../modelCatalogMeta";
import type { ModelArchetype } from "./types";

// BytePlus Seedream 图像档案。与火山方舟 seedreamVolcengine 同 API 契约（POST /api/v3/images/generations 同步出图），
// 仅域名与区域不同。size = 像素 WxH 且 ≥ ~370 万像素（Seedream 5.0 最低分辨率约束）。

const opt = (values: string[]): ModelParameterControl["options"] => values.map((value) => ({ value, label: value }));

const SIZE_PARAM: ModelParameterControl = {
  key: "size",
  label: "尺寸",
  type: "select",
  options: opt(["2048x2048", "2304x1728", "1728x2304", "2560x1440", "1440x2560"]),
  defaultValue: "2048x2048",
};

export const SEEDREAM_BYTEPLUS_ARCHETYPE: ModelArchetype = {
  id: "byteplus-seedream",
  family: "seedream",
  label: "Seedream 5.0",
  kind: "image",
  defaultModeId: "t2i",
  transportTaskKind: "text_to_image",
  identifierPatterns: [
    "doubao-seedream-5-0-260128",
    "doubao-seedream-4-5-251128",
    "doubao-seedream-4-0-250828",
  ],
  modes: [
    {
      id: "t2i",
      intent: "text",
      vendorTerm: "文生图",
      hint: "Seedream 高清文生图",
      promptRequired: true,
      transportTaskKind: "text_to_image",
      slots: [],
      params: [SIZE_PARAM],
    },
    {
      id: "edit",
      intent: "edit",
      vendorTerm: "改图",
      hint: "给图（可多张）+ 提示词改图 / 多图融合",
      promptRequired: true,
      transportTaskKind: "image_edit",
      slots: [{ kind: "image_ref", label: "输入图", min: 1, max: 10, inputKey: "image_urls" }],
      params: [SIZE_PARAM],
    },
  ],
};
