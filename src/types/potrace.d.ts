declare module "potrace" {
  export interface PotraceOptions {
    threshold?: number;
    blackOnWhite?: boolean;
    color?: string;
    background?: string;
  }

  export class Potrace {
    constructor(options?: PotraceOptions);
    loadImage(target: Buffer, callback: (this: Potrace, error: Error | null) => void): void;
    setParameters(params: PotraceOptions): void;
    getPathTag(fillColor?: string, scale?: number): string;
  }
}
