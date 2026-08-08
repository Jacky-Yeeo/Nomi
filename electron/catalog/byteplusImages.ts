import type { HttpOperation, ProfileKind } from "./types";

// BytePlus Seedream 图片传输配方（单源）。形状 100% 复刻火山方舟同模型（同 API 契约，仅域名不同）。
// **同步**族：create 响应即结果（data[0].url），无 task_id / 无 query / 无 statusMapping。

const CREATE_HEADERS = { Authorization: "Bearer {{user_api_key}}", "Content-Type": "application/json" };

function seedreamCreateOp(): HttpOperation {
  return {
    method: "POST",
    path: "/api/v3/images/generations",
    headers: CREATE_HEADERS,
    body: { model: "{{model.modelKey}}", prompt: "{{request.prompt}}", size: "{{request.params.size}}", watermark: false },
    response_mapping: { image_url: "data.0.url" },
  };
}

function seedreamEditOp(): HttpOperation {
  return {
    method: "POST",
    path: "/api/v3/images/generations",
    headers: CREATE_HEADERS,
    body: {
      model: "{{model.modelKey}}",
      prompt: "{{request.prompt}}",
      image: "{{request.params.image_urls}}",
      sequential_image_generation: "disabled",
      size: "{{request.params.size}}",
      watermark: false,
    },
    response_mapping: { image_url: "data.0.url" },
  };
}

export type ByteplusImageModel = {
  modelKey: string;
  labelZh: string;
  archetypeId: string;
  mappings: { id: string; taskKind: ProfileKind; name: string; create: HttpOperation }[];
};

function seedreamModel(modelKey: string, labelZh: string, slug: string): ByteplusImageModel {
  return {
    modelKey,
    labelZh,
    archetypeId: "byteplus-seedream",
    mappings: [
      { id: `seed-byteplus-${slug}-text_to_image`, taskKind: "text_to_image", name: `${labelZh} · 文生图`, create: seedreamCreateOp() },
      { id: `seed-byteplus-${slug}-image_edit`, taskKind: "image_edit", name: `${labelZh} · 改图`, create: seedreamEditOp() },
    ],
  };
}

export const BYTEPLUS_IMAGE_MODELS: ByteplusImageModel[] = [
  seedreamModel("doubao-seedream-5-0-260128", "Seedream 5.0 lite", "seedream-5"),
  seedreamModel("doubao-seedream-4-5-251128", "Seedream 4.5", "seedream-4-5"),
  seedreamModel("doubao-seedream-4-0-250828", "Seedream 4.0", "seedream-4-0"),
];
