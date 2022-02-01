import { readFile } from "fs/promises";
import { get } from "http";
import { join } from "path";
import { Collection } from "../create-libraries";

// background information on styling: https://www.diagrams.net/doc/faq/svg-edit-colours

/** root of the SVG icon package */
const PACKAGE_ROOT = "node_modules/@material-design-icons/svg/";

/** Default fill color of styled icons. */
const DEFAULT_FILL_COLOR = "#000000";

/** Represents metadata for a single Material Design Icon. */
export interface MaterialIcon {
  /** Icon name with `_` instead of ` `. */
  name: string;

  /** List of unsupported families. */
  unsupported_families: string[];

  /** List of categories. */
  categories: string[];

  /** List of available sizes in pixels. */
  sizes_px: number[];
}

/** Represents the metadata of a Material Design Icon collection. */
export interface MaterialIconsMetadata {
  /** List of icon families (e.g., outlined, round, ...) */
  families: string[];

  /** List of material design icons. */
  icons: MaterialIcon[];
}

// /** Loads the metadata from the specified filename. */
// export async function loadMetaData(
//   metadataFilename: string
// ): Promise<MaterialIconsMetadata> {
//   const buffer = await readFile(metadataFilename);
//   return JSON.parse(buffer.toString());
// }

/** Constructs the icon filename given the family slug. */
function constructFilename(icon: MaterialIcon, familySlug: string): string {
  return join(PACKAGE_ROOT, familySlug, `${icon.name}.svg`);
}

/** Computes a lookup object mapping original family names to slugs. */
function computeFamilySlugs(families: string[]): { [family: string]: string } {
  const lookup: { [family: string]: string } = {};

  for (const family of families) {
    let familySlug: string = family
      .replace(/Material Icons( )?/, "")
      .replace(" ", "-")
      .trim()
      .toLowerCase();
    lookup[family] = familySlug.length > 0 ? familySlug : "filled";
  }

  return lookup;
}

/** Constructs an icon collection from the given metadata. */
export function parseCollection(metadata: MaterialIconsMetadata): Collection {
  const familySlugs = computeFamilySlugs(metadata.families);
  const tree: Collection = {};
  for (const family of metadata.families) {
    tree[familySlugs[family]] = {};
  }

  for (const family of metadata.families) {
    const familySlug = familySlugs[family];
    for (const icon of metadata.icons) {
      for (const category of icon.categories) {
        if (!icon.unsupported_families.includes(family)) {
          tree[familySlug][category] = {
            ...(tree[familySlug][category] || {}),
            [icon.name]: constructFilename(icon, familySlug),
          };
        }
      }
    }
  }

  return tree;
}

/** Reads the current version from the SVG icon package. */
export async function readVersion(): Promise<string> {
  const data = (await readFile(join(PACKAGE_ROOT, "package.json"))).toString();
  const packageInfo = JSON.parse(data);
  return packageInfo["version"];
}

/**
 * Modifies an SVG to include styles.
 *
 * @param svgData Original SVG data. (Is modified while adding styles.)
 * @returns Modified SVG data with added styles.
 */
export function createStyledSvg(svgData: string): string {
  svgData = svgData.replace(
    ">", // only replaces first occurence
    `><style type="text/css">.icon { fill: ${DEFAULT_FILL_COLOR}; }</style>`
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
      `<${shape} class="icon"`
    );
  }

  return svgData;
}

/** Fetches the metadata for Material Design Icons from fonts.google.com. */
export function fetchMetadata(): Promise<MaterialIconsMetadata> {
  return new Promise((resolve, reject) => {
    get("http://fonts.google.com/metadata/icons", (res) => {
      const { statusCode } = res;

      if (statusCode !== 200) {
        reject(
          new Error(`Unable to fetch metadata JSON! (status: ${statusCode})`)
        );
      } else {
        res.setEncoding("utf8");
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          try {
            // handle bug where metadata starts with ")]}'"
            const parsedData = JSON.parse(rawData.slice(rawData.indexOf("{")));
            resolve(parsedData);
          } catch (e) {
            reject(
              new Error(
                `Unable to parse metadata JSON! ${(e as Error).message || e}`
              )
            );
          }
        });
      }
    });
  });
}
