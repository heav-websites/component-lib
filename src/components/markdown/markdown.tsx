import { component$, useComputed$, useStylesScoped$ } from "@builder.io/qwik";
import { marked } from "marked";
import styles from "./markdown.scss?inline";

/**
 * Renders markdown. Unless `disable_default_styles` is set, it gets default
 * styles; the blockquote colour can be changed with the
 * `--markdown-blockquote-color` CSS variable (default #666).
 */
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
