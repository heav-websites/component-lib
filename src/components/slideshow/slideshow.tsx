import {
  $,
  QRL,
  Slot,
  component$,
  untrack,
  useId,
  useOnWindow,
  useSignal,
  useStyles$,
  useTask$,
  useVisibleTask$,
} from "@builder.io/qwik";
import styles from "./slideshow.scss?inline";
import LucideIcon from "~/components/lucide-icon/lucide_icon";
import { ChevronLeft, ChevronRight } from "lucide";
import { useIdleMouse } from "~/hooks/use_idle_mouse";
import { useDebouncer } from "~/utils/useDebouncer";

// Higher = faster animation
const SMOOTH_SCROLL_DECAY = 8;
const MIN_TOUCH_MOVEMENT = 50;

type PageProps = {
  index: number;
  image?: boolean;
  id?: string;
};

export const SlidePage = component$<PageProps>((props) => {
  return (
    <div
      data-slide-index={props.index}
      id={props.id}
      class={{
        "slideshow-page": true,
        "slideshow-image-page": props.image ?? false,
      }}
      style={{
        "--index": props.index,
      }}
    >
      <Slot />
    </div>
  );
});

export default component$<{
  slide_count: number;
  slide_index?: number;
  on_changed_slide?: QRL<(index: number) => unknown>;
}>((props) => {
  useStyles$(styles);

  const id = useId();
  const elementId = `${id}-element`;

  const is_mouse_idle = useIdleMouse();
  const current_touch = useSignal<{
    startTouchPos: {x: number, y: number},
    startTouchScrollLeft: number,
  } | null>(null);

  const slide_index = useSignal(untrack(() => props.slide_index) ?? 0);
  const animated_slide_index = useSignal(untrack(() => slide_index.value));

  const change_slide = $((diff: number) => {
    const el = typeof document !== "undefined" ? document.getElementById(elementId) : null;
    if (el == null) return;

    slide_index.value = Math.min(Math.max(slide_index.value + diff, 0), props.slide_count - 1);
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
    const offset = Math.sign(e.deltaX) + Math.sign(e.deltaY);
    debounced_change_slide(offset);
  });

  useVisibleTask$(({ cleanup }) => {
    const el = typeof document !== "undefined" ? document.getElementById(elementId) : null;
    if (el == null) return;

    let stopped = false;
    let last_t: number = +(document.timeline.currentTime ?? 0) / 1000;
    animated_slide_index.value = slide_index.value;

    const update = (dt: number) => {
      if (current_touch.value != null) return;

      animated_slide_index.value = slide_index.value + (animated_slide_index.value - slide_index.value) * Math.exp(-SMOOTH_SCROLL_DECAY * dt);
      el.scrollLeft = animated_slide_index.value * el.clientWidth;
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
    <div class={{ slideshow: true, "force-round-cursor": is_mouse_idle.value }}>
      <div class={`arrow left-arrow ${is_mouse_idle.value ? "hide" : ""}`}>
        <button
          aria-label="Slide precedante"
          onClick$={() => change_slide(-1)}
          disabled={props.slide_count <= 1 || slide_index.value === 0}
        >
          <LucideIcon
            icon={ChevronLeft}
            size={2} width={1}
            outline={{ size: 1, color: "white" }}
          />
        </button>
      </div>
      <div class="slideshow-container-container">
        <div
          class="slideshow-container"
          id={elementId}

          preventdefault:wheel stoppropagation:wheel
          onWheel$={onWheel}

          preventdefault:touchmove
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

              animated_slide_index.value = el.scrollLeft / el.clientWidth;
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
      <div class={`arrow right-arrow ${is_mouse_idle.value ? "hide" : ""}`}>
        <button
          aria-label="Slide suivante"
          onClick$={() => change_slide(1)}
          disabled={props.slide_count <= 1 || slide_index.value + 1 === props.slide_count}
        >
          <LucideIcon
            icon={ChevronRight}
            size={2} width={1}
            outline={{ size: 1, color: "white" }}
          />
        </button>
      </div>
    </div>
  );
});
