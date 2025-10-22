import { component$, useComputed$, useStylesScoped$ } from "@builder.io/qwik";
import { marked } from "marked";
import styles from "./markdown.scss?inline";

export default component$<{
  text: string,
}>(props => {
  useStylesScoped$(styles);
  const formatted = useComputed$(() => marked.parse(props.text));

  return <div
    class="markdown"
    dangerouslySetInnerHTML={formatted.value}
  />;
});
