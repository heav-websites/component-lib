import {
  type Signal,
  createContextId,
  useContext,
  useContextProvider,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";

const defaultProviderConfig: IdleMouseProviderConfig = {
  mouseDuration: 1000,
  touchscreenDuration: 1500,
};

export type IdleMouseProviderConfig = {
  mouseDuration: number,
  touchscreenDuration: number,
};

function getMouseIdleTimeoutDuration(cfg: IdleMouseProviderConfig) {
  if (window.matchMedia("(hover: hover)").matches) {
    return cfg.mouseDuration;
  }
  return cfg.touchscreenDuration;
}
const mouse_idle_context_id = createContextId<Signal<boolean>>("idle-mouse");

export function useIdleMouseProvider(partial_cfg: Partial<IdleMouseProviderConfig>) {
  const cfg = { ...defaultProviderConfig, ...partial_cfg };

  const is_mouse_idle = useSignal(false);
  const clear_timeout = useSignal<NodeJS.Timeout | null>(null);
  useContextProvider(mouse_idle_context_id, is_mouse_idle);

  useVisibleTask$(({ cleanup }) => {
    const last_known_pos: [x: number, y: number] = [0, 0];

    const f = (event: object | null) => {
      if (clear_timeout.value !== null) clearTimeout(clear_timeout.value);

      if (event instanceof MouseEvent) {
        last_known_pos[0] = event.clientX;
        last_known_pos[1] = event.clientY;
      }

      clear_timeout.value = setTimeout(() => {
        let is_on_interactable = false;
        // When on a device that can hover elements, do not idle the mouse
        // if it is not moving on an element that has a pointer cursor
        if (window.matchMedia("(hover: hover)").matches) {
          const el = document.elementFromPoint(
            last_known_pos[0],
            last_known_pos[1]
          );
          is_on_interactable =
            el === null
              ? false
              : window.getComputedStyle(el)["cursor"] === "pointer";
        }
        is_mouse_idle.value = !is_on_interactable;
      }, getMouseIdleTimeoutDuration(cfg));
      is_mouse_idle.value = false;
    };
    f(null);

    const events: Array<keyof WindowEventMap> = [
      "load",
      "mousemove",
      "click",
      "dragstart",
      "dragend",
      "drag",
      "touchstart",
      "touchend",
      "touchmove",
      "touchcancel",
    ];
    events.forEach((e) => window.addEventListener(e, f));
    cleanup(() => {
      events.forEach((e) => window.removeEventListener(e, f));
    });
  }, { strategy: "document-idle" });
}

export function useIdleMouse(): Readonly<Signal<boolean>> {
  return useContext(mouse_idle_context_id);
}
