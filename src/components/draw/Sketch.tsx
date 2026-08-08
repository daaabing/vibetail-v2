/**
 * The drawing kit.
 *
 * Every illustration in the app is plain SVG line-work run through one
 * displacement filter, which is what makes clean paths read as hand-drawn.
 * Mount <SketchDefs /> once at the root; the filter is referenced by id.
 */

export const ROUGH = "url(#vt-rough)";
export const ROUGH_SOFT = "url(#vt-rough-soft)";

export function SketchDefs() {
  return (
    <svg
      aria-hidden
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {/* The house stroke. Displacement gives the line its wobble; the
            turbulence composited into the alpha erodes the edges so it reads
            as a grease pencil dragged over paper rather than a vector. */}
        <filter id="vt-rough" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.024"
            numOctaves="3"
            seed="7"
            result="warp"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale="2.8"
            xChannelSelector="R"
            yChannelSelector="G"
            result="wobbled"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.7"
            numOctaves="2"
            seed="11"
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 -0.55 1.02"
            result="grainMask"
          />
          <feComposite in="wobbled" in2="grainMask" operator="in" result="dry" />
          {/* Keep a little of the solid stroke underneath so thin lines
              survive the erosion. */}
          <feMerge>
            <feMergeNode in="dry" />
            <feMergeNode in="dry" />
          </feMerge>
        </filter>

        {/* Gentler variant for large scenes, where the full treatment reads
            as damage rather than texture. */}
        <filter id="vt-rough-soft" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.011"
            numOctaves="2"
            seed="3"
            result="warp"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale="1.8"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

export interface SketchProps {
  size?: number | string;
  /** Defaults to a 100×100 square; wider scenes pass their own. */
  viewBox?: string;
  className?: string;
  /** Ink colour. Defaults to the surrounding text colour. */
  color?: string;
  /** Wash colour painted behind the line-work. */
  wash?: string;
  strokeWidth?: number;
  soft?: boolean;
  style?: React.CSSProperties;
}

/**
 * Wraps a set of paths in a square viewBox with the rough filter applied.
 * Children should be plain SVG using stroke="currentColor" / fill="none".
 */
export function Sketch({
  size = "100%",
  viewBox = "0 0 100 100",
  className = "",
  color,
  strokeWidth = 2.4,
  soft = false,
  style,
  children,
}: SketchProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      width={size}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden
      style={{ display: "block", color, overflow: "visible", height: "auto", ...style }}
    >
      <g
        filter={soft ? ROUGH_SOFT : ROUGH}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}
