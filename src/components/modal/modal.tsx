import {
  $,
  type Signal,
  component$,
  useOnWindow,
  useSignal,
  useStylesScoped$,
  useTask$,
  Resource,
  QRL,
} from "@builder.io/qwik";
import { X } from "lucide";
import type { JSX } from "@builder.io/qwik/jsx-runtime";

import styles from "./modal.scss?inline";
import LucideIcon from "~/components/lucide-icon/lucide_icon";
import { useIdleMouse } from "~/hooks/use_idle_mouse";

const InnerModal = (props: {
  ref: Signal<HTMLDivElement | undefined>,
  modal_content: () => (Promise<JSX.Element> | JSX.Element),
  opened: boolean;
  onClose$?: () => unknown;
  idleMouse: boolean;
  opaque: boolean;
}) => (
  <div
    ref={props.ref}
    class={{
      modal: true,
      opened: props.opened,
      closed: !props.opened,
    }}
  >
    <div class={["overlay", { opaque: props.opaque }]} />
    <div class="content">
      <Resource
        value={(async () => props.modal_content())()}
        onResolved={x => x}
      />
    </div>
    <button
      class={`close-button ${props.idleMouse ? "hidden" : ""}`}
      onClick$={props.onClose$}
    >
      <LucideIcon icon={X} size={1.3} width={1} outline={{ size: 2, color: "white" }} />
    </button>
  </div>
);

export default component$<{
  containerRef?: Signal<HTMLDivElement | undefined>,
  modal_content: QRL<() => JSX.Element>,
  value: boolean;
  onClose$?: QRL<() => unknown>;
  opaque?: boolean;
  fullscreen?: boolean,
}>((props) => {
  useStylesScoped$(styles);

  const is_mouse_idle = useIdleMouse();
  const should_render = useSignal(false);
  const ref = useSignal<HTMLDivElement | undefined>();

  useTask$(({ track }) => {
    const propsRef = track(() => props.containerRef);
    if (propsRef == null) return;
    propsRef.value = track(ref);
  });

  useTask$(({ track, cleanup }) => {
    const new_value = track(() => props.value);
    if (new_value === should_render.value)
      return;

    if (new_value) {
      should_render.value = true;
    }
    else {
      const p = setTimeout(() => {
        should_render.value = false;
      }, 250);
      cleanup(() => clearTimeout(p));
    }
  });

  useTask$(({ track }) => {
    if (!track(() => props.fullscreen)) return;

    const el = track(ref);
    if (el && props.value)
      el.requestFullscreen();
  });
  useTask$(({ track }) => {
    if (!track(() => props.fullscreen)) return;

    const isClosing = !track(() => props.value);
    const el = track(ref);

    if (isClosing && el && el === document.fullscreenElement)
      document.exitFullscreen();
  });

  useOnWindow(
    "keyup",
    $((e: KeyboardEvent) => {
      if (!props.value) return;
      if (e.code !== "Escape") return;
      props.onClose$?.();
    }) as any
  );

  if (should_render.value)
    return (
      <InnerModal
        ref={ref}
        modal_content={props.modal_content}
        opened={props.value}
        onClose$={props.onClose$}
        idleMouse={is_mouse_idle.value}
        opaque={props.opaque ?? false}
      />
    );
  else return <> </>;
});
