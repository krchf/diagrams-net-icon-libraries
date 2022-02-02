// background information on styling: https://www.diagrams.net/doc/faq/svg-edit-colours

/** default fill color of styled icons */
const DEFAULT_FILL_COLOR = "#000000";

/** default name of added CSS class (shows up in diagrams.net UI as "Fill .<DEFAULT_CLASS_NAME>" ) */
const DEFAULT_CLASS_NAME = "icon";

/**
 * Modifies an SVG to include styles.
 *
 * @param svgData Original SVG data. (Is modified while adding styles.)
 * @returns Modified SVG data with added styles.
 */
export function createStyledSvg(svgData: string): string {
  svgData = svgData.replace(
    ">", // only replaces first occurrence
    `><style type="text/css">.${DEFAULT_CLASS_NAME} { fill: ${DEFAULT_FILL_COLOR}; }</style>`
  );

  const svgShapes = [
    "circle",
    "ellipse",
    "line",
    "path",
    "polygon",
    "polyline",
    "rect",
  ];

  for (const shape of svgShapes) {
    svgData = svgData.replace(
      new RegExp("<" + shape, "g"),
      `<${shape} class="${DEFAULT_CLASS_NAME}"`
    );
  }

  return svgData;
}
