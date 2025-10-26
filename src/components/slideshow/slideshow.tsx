import {
  $,
  QRL,
  Slot,
  component$,
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
import { useDebouncer } from "../../utils/useDebouncer";

// Higher = faster animation
const SMOOTH_SCROLL_DECAY = 8;
const MIN_TOUCH_MOVEMENT = 50;

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

function leftScrollAtIndexInterpolated(el: HTMLElement, idx: number): number {
  const whole = Math.trunc(idx);
  if (Math.abs(whole - idx) < 0.00001)
    return leftScrollAtIndex(el, Math.round(idx));

  const floor = Math.floor(idx);
  const ceil = Math.ceil(idx);

  // const frac = Math.abs(idx - whole);
  const lower = leftScrollAtIndex(el, floor);
  const higher = leftScrollAtIndex(el, ceil);

  return lower * (1 - Math.abs(floor - idx)) + higher * (1 - Math.abs(ceil - idx));
}

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

  console.log({
    closestBigger,
    closestSmaller,
    gap,
    result: closestSmaller.index * (1 - closestSmaller.dist / gap) + closestBigger.index * (1 - closestBigger.dist / gap),
  });

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
  const elementId = `${id}-element`;

  const is_mouse_idle_raw = useIdleMouse();
  const is_mouse_idle = useComputed$(() => (props.idle_hide_arrows ?? true) && is_mouse_idle_raw.value);

  const current_touch = useSignal<{
    startTouchPos: {x: number, y: number},
    startTouchScrollLeft: number,
  } | null>(null);

  const slide_index = useSignal(untrack(() => props.slide_index) ?? 0);
  const animated_slide_index = useSignal(untrack(() => slide_index.value));

  const change_slide = $((diff: number) => {
    const el = typeof document !== "undefined" ? document.getElementById(elementId) : null;
    if (el == null) return;
    let target = slide_index.value + diff;
    if (!props.infinite) {
      target = Math.min(Math.max(target, 0), props.slide_count - 1);
    }
    slide_index.value = target;
    props.on_changed_slide?.(slide_index.value);
  });
  const debounced_change_slide = useDebouncer(change_slide, 100);

  useOnWindow(
    "keydown",
    $(e => {
      if (!(e instanceof KeyboardEvent))
        return;
      if (e.key === "ArrowLeft") {
        change_slide(-1);
        e.preventDefault();
      }
      else if (e.key === "ArrowRight") {
        change_slide(1);
        e.preventDefault();
      }
    })
  );

  useTask$(({ track }) => {
    const nidx = track(() => props.slide_index);
    if (nidx != null && nidx !== slide_index.value) {
      slide_index.value = nidx;
      props.on_changed_slide?.(slide_index.value);
    }
  });

  const onWheel = $((e: WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      debounced_change_slide(Math.sign(e.deltaX));
    }
  });

  useVisibleTask$(({ cleanup }) => {
    if (typeof document === "undefined") return;

    let stopped = false;
    let last_t: number = +(document.timeline.currentTime ?? 0) / 1000;
    animated_slide_index.value = slide_index.value;

    const update = (dt: number) => {
      const el = document.getElementById(elementId);
      if (el == null) return;

      if (current_touch.value != null) return;

      animated_slide_index.value = slide_index.value + (animated_slide_index.value - slide_index.value) * Math.exp(-SMOOTH_SCROLL_DECAY * dt);

      let finiteIndex = Math.round(animated_slide_index.value * 100_000) / 100_000;
      while (finiteIndex >= props.slide_count)
        finiteIndex -= props.slide_count;
      while (finiteIndex <= -1)
        finiteIndex += props.slide_count;
      el.scrollLeft = leftScrollAtIndexInterpolated(el, finiteIndex);
    };
    
    const frame = (t: number) => {
      t /= 1000;
      if (stopped) return;
      update(t - last_t);
      last_t = t;
      requestAnimationFrame(frame);
    };
    frame(last_t);

    cleanup(() => {
      stopped = true;
    })
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
            size={2} width={1}
            outline={{ size: 1, color: "white" }}
          />
        </button>
      </div>
      <div class="slideshow-container-container">
        <div
          class="slideshow-container"
          id={elementId}

          onWheel$={onWheel}

          onTouchStart$={(t, el) => {
            for (const touch of t.changedTouches) {
              if (touch.identifier !== 0)
                continue;
              current_touch.value = {
                startTouchPos: { x: touch.clientX, y: touch.clientY },
                startTouchScrollLeft: el.scrollLeft,
              };
            }
          }}
          onTouchMove$={(t, el) => {
            const ct = current_touch.value;
            if (!ct) return;

            for (const touch of t.changedTouches) {
              if (touch.identifier !== 0)
                continue;
              const dx = ct.startTouchPos.x - touch.clientX;
              el.scrollLeft = ct.startTouchScrollLeft + dx;
            }
          }}
          onTouchEnd$={(t, el) => {
            const ct = current_touch.value;
            if (!ct) return;

            for (const touch of t.changedTouches) {
              if (touch.identifier !== 0)
                continue;

              const newSlideIndex = indexAtLeftScroll(el, el.scrollLeft);
              const closestAround = Math.round((animated_slide_index.value - newSlideIndex) / props.slide_count);
              animated_slide_index.value = props.slide_count * closestAround + newSlideIndex;

              const dx = ct.startTouchPos.x - touch.clientX;
              if (Math.abs(dx) >= MIN_TOUCH_MOVEMENT)
                change_slide(Math.sign(dx));

              current_touch.value = null;
            }
          }}
        >
          <Slot />
        </div>
      </div>
      <div class={[`arrow`, `right-arrow`, { hide: is_mouse_idle.value }]}>
        <button
          aria-label="Slide suivante"
          onClick$={() => change_slide(1)}
          disabled={!(props.infinite ?? false) && (props.slide_count <= 1 || slide_index.value + 1 === props.slide_count)}
        >
          <LucideIcon
            icon={props.right_icon ?? ChevronRight}
            size={2} width={1}
            outline={{ size: 1, color: "white" }}
          />
        </button>
      </div>
    </div>
  );
});
