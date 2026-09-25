
export type Object<T> = {
  id: number;
} & T;

export type ImageCore = {
  name: string;
  width: number;
  height: number;
  hash: string;
  ext: string;
  mime: string;
  url: string;
};

export type Image = ImageCore & {
  alternativeText?: string | null;
  /** Resized variants, keyed by size name (thumbnail, small, medium, large). */
  formats?: {
    [key: string]: ImageCore;
  } | null;
};
