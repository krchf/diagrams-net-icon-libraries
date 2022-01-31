import { readFile } from "fs/promises";
import { join } from "path";
import { FileTree } from "../create-libraries";

// root of the SVG icon package
const PACKAGE_ROOT = "node_modules/@material-design-icons/svg/";

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

/** Loads the metadata from the specified filename. */
export async function loadMetaData(
  metadataFilename: string
): Promise<MaterialIconsMetadata> {
  const buffer = await readFile(metadataFilename);
  return JSON.parse(buffer.toString());
}

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

/** Construct an icon mapping from the given metadata. */
export function constructFileTree(metadata: MaterialIconsMetadata): FileTree {
  const familySlugs = computeFamilySlugs(metadata.families);
  const tree: FileTree = {};
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
