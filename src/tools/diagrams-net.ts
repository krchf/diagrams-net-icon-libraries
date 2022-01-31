import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

/** Represents a diagrams.net icon. */
export interface DiagramsNetIcon {
  /** Base64-encoded SVG data. */
  data: string;
  /** Icon width. */
  w: number;
  /** Icon height. */
  h: number;
  /** Display title of the icon. */
  title: string;
  /** Aspect ratio. */
  aspect: "fixed";
}

/** Reads and converts the specified SVG icon to diagrams.net format. */
export function convertIcon(
  svgFilename: string,
  title: string
): DiagramsNetIcon {
  return {
    data:
      "data:image/svg+xml;base64," +
      readFileSync(svgFilename).toString("base64"),
    w: 24,
    h: 24,
    title: title.replace(/_/g, " "),
    aspect: "fixed",
  };
}

/** Creates and saves the specified icons into a diagrams.net library at the given path. */
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
