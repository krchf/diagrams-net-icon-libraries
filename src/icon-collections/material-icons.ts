import { readFile } from "fs/promises";
import { get } from "http";
import { join } from "path";
import {
  allCategory,
  CollectionLoaderFn,
  IconCollection,
  IconLoaderFn,
} from "../create-libraries";
import { createStyledSvg } from "../tools/svg-styling";

/** root of the SVG icon package */
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

/** Loader function for Material Design Icons applying style modifications. (Does not need category parameter.) */
const loadMaterialIcon: IconLoaderFn = async (family, _, iconName) => {
  const filename = join(PACKAGE_ROOT, family, `${iconName}.svg`);

  try {
    const originalIconData = (await readFile(filename)).toString();
    const styledIconData = createStyledSvg(originalIconData);
    return styledIconData;
  } catch (err) {
    console.error(
      "Error while loading and styling icon:",
      (err as Error).message
    );
    return;
  }
};

/**
 * Computes a lookup object mapping original family names to slugs (= abbreviations)
 * compatible with the @material-design-icons/svg package.
 *
 * @param families List of families.
 * @returns Mapping from original family name to slug.
 */
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

/** Fetches metadata for Material Design Icons and constructs an icon collection based on it. */
export const parseMaterialDesignIconCollection: CollectionLoaderFn =
  async (): Promise<IconCollection> => {
    const metadata = await fetchMetadata();
    const familySlugs = computeFamilySlugs(metadata.families);
    const collection: IconCollection = {
      name: "Material-Icons",
      version: await readVersion(),
      website: "https://fonts.google.com/icons",
      author: { name: "Google" },
      loaderFn: loadMaterialIcon,
      license: {
        name: "Apache License Version 2.0",
        summary:
          "We have made these icons available for you to incorporate into your products under the Apache License Version 2.0. Feel free to remix and re-share these icons and documentation in your products. We'd love attribution in your app's about screen, but it's not required.",
        source: "https://github.com/google/material-design-icons",
      },
      icons: {},
    };

    for (const family of metadata.families) {
      const familySlug = familySlugs[family];
      collection.icons[familySlug] = {
        [allCategory]: [],
      };

      for (const icon of metadata.icons) {
        for (const category of icon.categories) {
          if (!icon.unsupported_families.includes(family)) {
            collection.icons[familySlug][category] = [
              ...(collection.icons[familySlug][category] || []),
              icon.name,
            ];
            collection.icons[familySlug][allCategory] = [
              ...collection.icons[familySlug][allCategory],
              icon.name,
            ];
          }
        }
      }
    }

    return collection;
  };

/** Reads the current version from the @material-design-icons/svg package. */
export async function readVersion(): Promise<string> {
  const data = (await readFile(join(PACKAGE_ROOT, "package.json"))).toString();
  const packageInfo = JSON.parse(data);
  return packageInfo["version"];
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
