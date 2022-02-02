import { rm } from "fs/promises";
import { join } from "path";
import {
  convertSvgToStyledIcon,
  writeDiagramsNetLibrary,
} from "./tools/diagrams-net";
import { parseMaterialDesignIconCollection } from "./tools/material-icons";

// destination directory for libraries
const OUT_DIR = "dist/icon-libraries";

/** Represents a function returning an icon's SVG data given a family, category and icon name. */
export type IconLoaderFn = (
  family: string,
  category: string,
  iconName: string
) => Promise<string>;

/** Internal representation of an icon collection. */
export interface IconCollection {
  /** Name of the icon collection. */
  name: string;

  /** Version of the icon collection. */
  version: string;

  /** Function to load icons from disk. */
  loaderFn: IconLoaderFn;

  /** Mapping from _family_ to _categories_ to list of associated _icon names_. */
  icons: {
    [familyName: string]: {
      [categoryName: string]: string[];
    };
  };
}

/** Creates a library for each (family,category)-combination from the specified collection. */
async function createLibraries(collection: IconCollection) {
  console.log("Handling", collection.name, collection.version);

  for (const [family, categoriesObj] of Object.entries(collection.icons)) {
    console.log("Handling family", family);
    for (const [category, icons] of Object.entries(categoriesObj)) {
      console.log("Handling category", category);
      const libraryIcons = [];

      for (const iconName of icons) {
        const svgData = await collection.loaderFn(family, category, iconName);
        libraryIcons.push(convertSvgToStyledIcon(svgData, iconName));
      }

      const libraryFilename = `${collection.name}_${capitalize(
        family
      )}_${capitalize(category)}.xml`;

      writeDiagramsNetLibrary(
        join(OUT_DIR, collection.name, family, libraryFilename),
        libraryIcons
      );
    }
  }
}

/** Capitalizes a string considering hyphenation. */
function capitalize(str: string): string {
  return str
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

(async () => {
  // remove any old files
  await rm(OUT_DIR, { recursive: true, force: true });

  // create collection and diagrams.net libraries
  const collection = await parseMaterialDesignIconCollection();
  createLibraries(collection);
})();
