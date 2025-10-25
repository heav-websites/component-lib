import { component$, useComputed$, useStylesScoped$ } from "@builder.io/qwik";
import { marked } from "marked";
import styles from "./markdown.scss?inline";

export default component$<{
  text: string,
  disable_default_styles?: boolean,
}>(props => {
  useStylesScoped$(styles);
  const formatted = useComputed$(() => marked.parse(props.text));

  return <div
    class={["markdown", { "default-styles": !(props.disable_default_styles ?? false) }]}
    dangerouslySetInnerHTML={formatted.value}
  />;
});
