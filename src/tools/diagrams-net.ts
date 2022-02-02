import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import { deflateRawSync } from "zlib";

/** Represents a diagrams.net icon. */
interface DiagramsNetBaseIcon {
  /** Icon width. */
  w: number;
  /** Icon height. */
  h: number;
  /** Display title of the icon. */
  title: string;
  /** Aspect ratio. */
  aspect: "fixed";
}

/** Represents a diagrams.net icon without styles. */
interface DiagramsNetUnstyledIcon extends DiagramsNetBaseIcon {
  /** Base64-encoded SVG data. */
  data?: string;
}

/** Represents a diagrams.net icon with styles. */
interface DiagramsNetStyledIcon extends DiagramsNetBaseIcon {
  /** Encoded XML icon data. */
  xml?: string;
}

/** Represents any diagrams.net icon type. */
type DiagramsNetIcon = DiagramsNetUnstyledIcon | DiagramsNetStyledIcon;

/**
 * Converts an SVG-file into a diagrams.net styled icon.
 *
 * @param svgData Data of the original SVG.
 * @param title Human-readable title of the icon.
 * @returns Styled diagrams.net icon.
 */
export function convertSvgToStyledIcon(
  svgData: string,
  title: string
): DiagramsNetStyledIcon {
  const svgBase64 = Buffer.from(svgData).toString("base64");

  let xmlIconData = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>`;
  xmlIconData += `<mxCell id="2" value="" style="editableCssRules=.*;shape=image;verticalLabelPosition=bottom;verticalAlign=top;imageAspect=0;aspect=fixed;`;
  xmlIconData += `image=data:image/svg+xml,${svgBase64}" `;
  xmlIconData += `vertex="1" parent="1"><mxGeometry width="24" height="24" as="geometry"/></mxCell></root></mxGraphModel>`;

  // see https://github.com/jgraph/drawio-tools/blob/master/tools/convert.html
  const encodedXmlData = deflateRawSync(
    encodeURIComponent(xmlIconData)
  ).toString("base64");

  return {
    xml: encodedXmlData,
    w: 24,
    h: 24,
    title: title.replace(/_/g, " "),
    aspect: "fixed",
  };
}

/**
 * Creates and saves the specified icons into a diagrams.net library at the given path.
 *
 * @param libraryFilename Filename where to save the file.
 * @param icons Diagrams.net icons to include in the library.
 */
export function writeLibrary(
  libraryFilename: string,
  icons: DiagramsNetIcon[]
): void {
  mkdirSync(dirname(libraryFilename), { recursive: true });
  writeFileSync(
    libraryFilename,
    `<mxlibrary>[${icons.map((i) => JSON.stringify(i)).join(",")}]</mxlibrary>`
  );
}
