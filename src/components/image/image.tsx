import {
    $,
  ClassList,
  component$,
  CSSProperties,
  QRL,
  Slot,
  useComputed$,
  useStylesScoped$,
} from "@builder.io/qwik";
import { Image as ImageIcon, ImageOff } from "lucide";

import styles from "./image.scss?inline";
import * as strapi from "../../utils/strapi";
import LucideIcon from "../../components/lucide-icon/lucide_icon";

const DEFAULT_WIDTH = 1000;
const DEFAULT_QUALITY = 80;

type URL_ARGS = {
  img: strapi.Object<strapi.Image>,
  enabledCloudflareImageTransform: boolean,
  baseUrl?: string | undefined | null,
  w: number,
  q: number,
};
function url(args: URL_ARGS) {
  if (!args.enabledCloudflareImageTransform) {
    return `${args.baseUrl ?? ""}${args.img.url}`;
  }

  return `${args.baseUrl ?? ""}/cdn-cgi/image/q=${args.q},f=auto,w=${args.w}${args.img.url}`;
}

type DataAttrs = { [key in `data-${string}`]?: string };

export default component$<{
  img: strapi.Object<strapi.Image>;
  baseUrl: string,
  enabledCloudflareImageTransform?: boolean,
  containerClass?: ClassList,
  containerDataAttributes?: DataAttrs,
  containerStyles?: CSSProperties,
  containerOnClick?: QRL<() => unknown>,
  eager?: boolean;
  sizes?: string;
  alt?: string;
  fallbackAlt?: string;
  srcWidth?: number, quality?: number,
  fetchPriority?: "high" | "low" | "auto",
  disableLoadingAnimation?: boolean,
}>((props) => {
  useStylesScoped$(styles);

  const url_args = useComputed$<URL_ARGS>(() => ({
    img: props.img,
    enabledCloudflareImageTransform: props.enabledCloudflareImageTransform ?? false,
    baseUrl: props.baseUrl,
    q: props.quality ?? DEFAULT_QUALITY,
    w: props.srcWidth ?? DEFAULT_WIDTH,
  }));
  const src_set = useComputed$(() => {
    const args = url_args.value;

    let t = "";
    for (
      let w = 100;
      w <= Math.min(4000, props.img.width);
      w += 100
    ) {
      t += `${url({ ...args, w })} ${w}w,`;
    }
    return t;
  });
  const src = useComputed$(() => url(url_args.value));

  const add_loaded = $((_: Event, el: HTMLElement) => el.parentElement?.classList.add("loaded"));
  const add_error = $((_: Event, el: HTMLElement) => el.parentElement?.classList.add("error"));

  return (
    <div
      class={["container", props.containerClass, { "loaded": !!props.disableLoadingAnimation }]}
      onClick$={props.containerOnClick}
      style={{ "aspect-ratio": `${props.img.width} / ${props.img.height}`, ...props.containerStyles }}
      {...props.containerDataAttributes}
    >
      {!props.disableLoadingAnimation && <div class="placeholder">
        <div class="loading-icon icon-container">
          <LucideIcon icon={ImageIcon} size={4} />
        </div>
        <div class="error-icon icon-container">
          <LucideIcon icon={ImageOff} size={4} />
        </div>
        <div
          class="contour"
          style={{
            "aspect-ratio":
              `${props.img.width} / ${props.img.height}`,
            "max-width": "100%",
            "max-height": "100%",
          }}
        />
      </div>}
      <Slot name="before" />
      <img
        {...(props.disableLoadingAnimation ? {} : { onload: "this.parentElement.classList.add('loaded')" }) as any}
        onLoad$={props.disableLoadingAnimation ? undefined : add_loaded}
        {...(props.disableLoadingAnimation ? {} : { onerror: "this.parentElement.classList.add('error')" }) as any}
        onError$={props.disableLoadingAnimation ? undefined : add_error}

        alt={props.alt ?? props.img.alternativeText ?? props.fallbackAlt ?? undefined}
        class="image"
        height={props.img.height}
        width={props.img.width}
        src={src.value}
        srcSet={props.enabledCloudflareImageTransform ? src_set.value : null}
        sizes={props.sizes ?? "100vmax"}
        loading={props.eager ? "eager" : "lazy"}
        fetchPriority={props.fetchPriority}
      />
      <Slot name="after" />
    </div>
  );
});
