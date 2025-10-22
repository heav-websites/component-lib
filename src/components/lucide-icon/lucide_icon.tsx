import { component$, useStylesScoped$ } from "@builder.io/qwik";
import styles from "./lucide_icon.scss?inline";
import type { IconNode } from "lucide";

/// Taken from lucide's source code ^^
const LUCIDE_DEFAULT_ATTRIBUTES = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
} as const;

const LucideIcon = component$<{
  icon: IconNode;
  size?: number;
  width?: number;
  outline?: Readonly<{ size: number; color: string }>;
}>(({ icon, size, outline, width }) => {
  useStylesScoped$(styles);

  const svgProps = {
    ...LUCIDE_DEFAULT_ATTRIBUTES,

    width: LUCIDE_DEFAULT_ATTRIBUTES.width * (size??1),
    height: LUCIDE_DEFAULT_ATTRIBUTES.height * (size??1),
    "stroke-width": width ?? LUCIDE_DEFAULT_ATTRIBUTES["stroke-width"],
  } as const;

  if (outline === undefined) {
    return (
      <svg {...svgProps}>
        {icon.map(([Tag, props], i) => (
          <Tag key={i} {...props}/>
        ))}
      </svg>
    );
  }

  return (
    <div class="lucide-icon">
      {outline ? (
        <div class="other">
          <svg
            {...svgProps}
            overflow="visible"
            stroke-width={ 2 * outline.size }
            style={{ color: outline.color }}
          >
            {icon.map(([Tag, props], i) => (
              <Tag key={i} {...props}/>
            ))}
          </svg>
        </div>
      ) : null}
      <svg {...svgProps}>
        {icon.map(([Tag, props], i) => (
          <Tag key={i} {...props}/>
        ))}
      </svg>
    </div>
  );
});

export default LucideIcon;
