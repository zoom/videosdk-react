import type ZoomVideo from "@zoom/videosdk";

export type MediaStream = ReturnType<VideoClient["getMediaStream"]>;
export type VideoClient = ReturnType<(typeof ZoomVideo)["createClient"]>;
