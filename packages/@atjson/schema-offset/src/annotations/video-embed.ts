import Document, { ObjectAnnotation } from "@atjson/document";
import { CaptionSchema } from "./caption-schema";
import { getClosestAspectRatio } from "../utils";

export class VideoEmbed extends ObjectAnnotation<{
  /**
   * The embed URL of the video
   */
  url: string;
  /**
   * A normalized aspect ratio of the video, constrained to
   * a list of aspect ratios
   */
  aspectRatio?: ReturnType<typeof getClosestAspectRatio>;
  /**
   * The natural width of the video, as returned by an
   * oEmbed endpoint.
   * @deprecated
   */
  width?: number;
  /**
   * The natural height of the video, as returned by an
   * oEmbed endpoint.
   * @deprecated
   */
  height?: number;
  caption?: Document<typeof CaptionSchema>;
}> {
  static type = "video-embed";
  static vendorPrefix = "offset";
  static subdocuments = { caption: CaptionSchema };
}