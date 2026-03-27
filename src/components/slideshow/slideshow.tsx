import {
  $,
  QRL,
  Slot,
  component$,
  sync$,
  untrack,
  useComputed$,
  useId,
  useOnWindow,
  useSignal,
  useStyles$,
  useTask$,
  useVisibleTask$,
} from "@builder.io/qwik";
import styles from "./slideshow.scss?inline";
import LucideIcon from "../../components/lucide-icon/lucide_icon";
import { ChevronLeft, ChevronRight, IconNode } from "lucide";
import { useIdleMouse } from "../../hooks/use_idle_mouse";

function getOffsetLeftWithinParent(el: Element, parent: Element) {
  const elRect = el.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  // return elRect.left - parentRect.left + parent.scrollLeft;
  
  // Remaining is for centering the element
  const remaining = parentRect.width - elRect.width;
  return elRect.left - parentRect.left + parent.scrollLeft - remaining / 2;
}

function getChildWithClass(el: HTMLElement, clas: string): Element | null {
  for (const child of el.children) {
    if (child.classList.contains(clas)) {
      return child;
    }
  }
  return null;
}

function leftScrollAtIndex(el: HTMLElement, idx: number): number {
  console.assert(Math.trunc(idx) === idx);
  const child = getChildWithClass(el, `slideshow-page-${idx}`);
  if (child == null) {
    console.warn(`No element found for slide index ${idx}`);
    return NaN;
  }
  return getOffsetLeftWithinParent(child, el);
}

// function leftScrollAtIndexInterpolated(el: HTMLElement, idx: number): number {
//   const whole = Math.trunc(idx);
//   if (Math.abs(whole - idx) < 0.00001)
//     return leftScrollAtIndex(el, Math.round(idx));

//   const floor = Math.floor(idx);
//   const ceil = Math.ceil(idx);

//   // const frac = Math.abs(idx - whole);
//   const lower = leftScrollAtIndex(el, floor);
//   const higher = leftScrollAtIndex(el, ceil);

//   return lower * (1 - Math.abs(floor - idx)) + higher * (1 - Math.abs(ceil - idx));
// }

function indexAtLeftScroll(el: HTMLElement, scrollLeft: number): number {
  type I = { dist: number, scroll: number, index: number };
  let closestSmaller: I | null = null;
  let closestBigger: I | null = null;

  for (const child of el.children) {
    const scroll = getOffsetLeftWithinParent(child, el);
    const dist = Math.abs(scrollLeft - scroll);
    if (scrollLeft >= scroll && (closestSmaller == null || closestSmaller.dist > dist)) {
      closestSmaller = { dist, scroll, index: parseInt(child.getAttribute("data-slide-index") ?? "NaN") };
    }
    if (scrollLeft <= scroll && (closestBigger == null || closestBigger.dist > dist)) {
      closestBigger = { dist, scroll, index: parseInt(child.getAttribute("data-slide-index") ?? "NaN") };
    }
  }

  if (closestBigger === null || closestSmaller === null)
    return closestBigger?.index ?? closestSmaller?.index ?? NaN;

  const gap = closestBigger.scroll - closestSmaller.scroll;
  if (gap === 0)
    return closestBigger.index;

  // console.log({
  //   closestBigger,
  //   closestSmaller,
  //   gap,
  //   result: closestSmaller.index * (1 - closestSmaller.dist / gap) + closestBigger.index * (1 - closestBigger.dist / gap),
  // });

  return closestSmaller.index * (1 - closestSmaller.dist / gap) + closestBigger.index * (1 - closestBigger.dist / gap);
}

export const SlidePage = component$<{
  index: number;
  image?: boolean;
  id?: string;
}>((props) => {
  return (
    <div
      data-slide-index={props.index}
      id={props.id}
      class={[
        "slideshow-page", `slideshow-page-${props.index}`,
        { "slideshow-image-page": props.image ?? false },
      ]}
      style={{ "--index": props.index }}
    >
      <Slot />
    </div>
  );
});

export default component$<{
  slide_count: number;
  slide_index?: number;
  on_changed_slide?: QRL<(index: number) => unknown>;
  /** If set to false, disables the hiding of the arrows and of the mouse when
   * the mouse is idle
   */
  idle_hide_arrows?: boolean,
  /**
   * Chose the icon for the left arrow
   */
  left_icon?: IconNode,
  /**
   * Chose the icon for the right arrow
   */
  right_icon?: IconNode,
  arrows_size?: number | string,
  /**
   * When set to true, the slides are forced to be full-width
   * Defaults to true
   */
  full_width_slides?: boolean,
  /**
   * When set to true, allows scrolling infinitely
   * Defaults to false
   */
  infinite?: boolean,
}>((props) => {
  useStyles$(styles);

  const id = useId();
  const slideshowContainerId = `${id}-element`;

  const is_mouse_idle_raw = useIdleMouse();
  const is_mouse_idle = useComputed$(() => (props.idle_hide_arrows ?? true) && is_mouse_idle_raw.value);

  // Set after pressing a button and the element is currently smooth scrolling, reset after
  // Used to distinguish scroll events
  const current_movement = useSignal<null | AbortController>(null);
  const slide_index = useSignal(untrack(() => props.slide_index) ?? 0);

  const set_slide = $((new_idx: number) => {
    if (slide_index.value === new_idx)
      return;
    slide_index.value = new_idx;
    props.on_changed_slide?.(new_idx);
  });
  const change_slide = $((diff: number) => {
    let target = slide_index.value + diff;
    if (Number.isNaN(target))
      target = 0;
    if (!props.infinite)
      target = Math.min(Math.max(target, 0), props.slide_count - 1);

    set_slide(target);

    const el = typeof document !== "undefined" ? document.getElementById(slideshowContainerId) : null;
    if (el == null) return;

    const controller = new AbortController();
    current_movement.value?.abort();
    current_movement.value = controller;
    console.log(`Scrolling to #${target}`);
    el.scrollTo({
      behavior: "smooth",
      left: leftScrollAtIndex(el, target),
    });
    el.addEventListener("scrollend", () => {
      if (current_movement.value === controller)
        current_movement.value = null;
    }, { once: true, signal: controller.signal })
  });

  useOnWindow("keydown", sync$((e: Event) => {
    if (!(e instanceof KeyboardEvent))
      return;
    switch(e.key) {
    case "ArrowLeft":
    case "ArrowRight":
      e.preventDefault();
      break;
    default:
    }
  }));
  useOnWindow("keydown", $(e => {
    if (!(e instanceof KeyboardEvent))
      return;
    if (e.key === "ArrowLeft")
      change_slide(-1);
    else if (e.key === "ArrowRight")
      change_slide(1);
  }));

  useTask$(({ track }) => {
    const nidx = track(() => props.slide_index);
    if (nidx != null && nidx !== slide_index.value) {
      slide_index.value = nidx;
      props.on_changed_slide?.(slide_index.value);
    }
  });

  // Sets the scrollLeft on container render based on the slide_index
  useVisibleTask$(() => {
    const el = typeof document !== "undefined" ? document.getElementById(slideshowContainerId) : null;
    if (el == null) return;

    el.scrollTo({
      behavior: "instant",
      left: leftScrollAtIndex(el, slide_index.value),
    });
  }, { strategy: "document-ready" });

  useTask$(({ track }) => {
    console.log("slide_index:", track(slide_index));
  });

  return (
    <div class={{
      slideshow: true,
      "force-round-cursor": is_mouse_idle.value,
      "full-width-slides": props.full_width_slides ?? true,
    }}>
      <div class={[`arrow`, `left-arrow`, { hide: is_mouse_idle.value }]}>
        <button
          aria-label="Slide precedante"
          onClick$={() => change_slide(-1)}
          disabled={!(props.infinite ?? false) && (props.slide_count <= 1 || slide_index.value === 0)}
        >
          <LucideIcon
            icon={props.left_icon ?? ChevronLeft}
            size={props.arrows_size ?? 2} width={1}
            outline={{ size: 1, color: "white" }}
          />
        </button>
      </div>
      <div
        class="slideshow-container"
        id={slideshowContainerId}
        onScroll$={(_event, el) => {
          // If we are currently moving to a slide then the slide index
          // shouldn't be updated as we are scrolling
          if (!current_movement.value)
            set_slide(Math.round(indexAtLeftScroll(el, el.scrollLeft)));
        }}
      >
        <Slot />
      </div>
      <div class={[`arrow`, `right-arrow`, { hide: is_mouse_idle.value }]}>
        <button
          aria-label="Slide suivante"
          onClick$={() => change_slide(1)}
          disabled={!(props.infinite ?? false) && (props.slide_count <= 1 || slide_index.value + 1 === props.slide_count)}
        >
          <LucideIcon
            icon={props.right_icon ?? ChevronRight}
            size={props.arrows_size ?? 2} width={1}
            outline={{ size: 1, color: "white" }}
          />
        </button>
      </div>
    </div>
  );
});
