import type { HttpOperation, ProfileKind } from "./types";

const CREATE_HEADERS = { Authorization: "Bearer {{user_api_key}}", "Content-Type": "application/json" };
const VARIANT_MODEL_REF = "{{request.params.model}}";

const TEXT_CONTENT = { type: "text", text: "{{request.prompt}}" };
const FIRST_IMAGE_CONTENT = "{{request.params.byteplus_first_image_content}}";
const FIRST_ROLE_IMAGE_CONTENT = "{{request.params.byteplus_first_role_image_content}}";
const LAST_ROLE_IMAGE_CONTENT = "{{request.params.byteplus_last_role_image_content}}";
const IMAGE_REF_CONTENTS = "{{request.params.byteplus_image_contents}}";
const VIDEO_REF_CONTENTS = "{{request.params.byteplus_video_contents}}";
const AUDIO_REF_CONTENTS = "{{request.params.byteplus_audio_contents}}";

function seedanceCreateOp(content: unknown[]): HttpOperation {
  return {
    method: "POST",
    path: "/api/v3/contents/generations/tasks",
    headers: CREATE_HEADERS,
    body: {
      model: VARIANT_MODEL_REF,
      content,
      resolution: "{{request.params.resolution}}",
      ratio: "{{request.params.ratio}}",
      duration: "{{request.params.duration}}",
      seed: "{{request.params.seed}}",
      generate_audio: "{{request.params.generate_audio}}",
      watermark: false,
    },
    response_mapping: { task_id: "id", status: "status" },
    provider_meta_mapping: { task_id: "id" },
  };
}

const T2V_CREATE = seedanceCreateOp([TEXT_CONTENT]);
const I2V_CREATE = seedanceCreateOp([
  TEXT_CONTENT,
  FIRST_IMAGE_CONTENT,
  FIRST_ROLE_IMAGE_CONTENT,
  LAST_ROLE_IMAGE_CONTENT,
  IMAGE_REF_CONTENTS,
  VIDEO_REF_CONTENTS,
  AUDIO_REF_CONTENTS,
]);

export const BYTEPLUS_SEEDANCE_QUERY_OP: HttpOperation = {
  method: "GET",
  path: "/api/v3/contents/generations/tasks/{{providerMeta.task_id}}",
  headers: { Authorization: "Bearer {{user_api_key}}" },
  response_mapping: {
    task_id: "id",
    status: "status",
    video_url: "content.video_url",
    error_message: "error.message",
  },
};

export const BYTEPLUS_SEEDANCE_STATUS_MAPPING = {
  queued: ["queued"],
  running: ["running"],
  succeeded: ["succeeded"],
  failed: ["failed", "expired", "cancelled", "canceled"],
};

export type ByteplusVideoModel = {
  modelKey: string;
  labelZh: string;
  archetypeId: string;
  mappings: { id: string; taskKind: ProfileKind; name: string; create: HttpOperation }[];
};

export const BYTEPLUS_VIDEO_MODELS: ByteplusVideoModel[] = [
  {
    modelKey: "doubao-seedance-2-0-260128",
    labelZh: "Seedance 2.0",
    archetypeId: "byteplus-seedance-2",
    mappings: [
      { id: "seed-byteplus-seedance-2-text_to_video", taskKind: "text_to_video", name: "Seedance 2.0 · 文生视频", create: T2V_CREATE },
      { id: "seed-byteplus-seedance-2-image_to_video", taskKind: "image_to_video", name: "Seedance 2.0 · 图生视频", create: I2V_CREATE },
    ],
  },
];
