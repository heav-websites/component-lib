
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
  formats: {
    [key: string]: ImageCore & {};
  }[];
};
