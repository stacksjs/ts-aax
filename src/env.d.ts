// Ambient type declarations for types used by ts-videos
// that are not available in bun's type definitions
declare class OffscreenCanvas {
  constructor(width: number, height: number)
  width: number
  height: number
  getContext(contextId: string, options?: unknown): unknown
}
