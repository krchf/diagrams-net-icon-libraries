import { readFile, rm } from "fs/promises";
import { join } from "path";
import { convertSvgToStyledIcon, writeLibrary } from "./tools/diagrams-net";
import {
  constructFileTree,
  createStyledSvg,
  loadMetaData,
  readVersion,
} from "./tools/material-icons";

// destination directory for libraries
const OUT_DIR = "icon-libraries";

/** Represents an icon collection as as mapping from family to categories to icons to filename. */
export interface Collection {
  [familyName: string]: {
    [categoryName: string]: {
      [iconName: string]: string;
    };
  };
}

/** Creates a library for each (family,category)-combination from the specified collection. */
async function createLibraries(collection: Collection) {
  const version = await readVersion();

  for (const [family, categoriesObj] of Object.entries(collection)) {
    console.log("Handling family", family);
    for (const [category, iconsObj] of Object.entries(categoriesObj)) {
      console.log("Handling category", category);
      const libraryIcons = [];

      for (const [iconName, iconFilepath] of Object.entries(iconsObj)) {
        const originalSvgData = (await readFile(iconFilepath)).toString();
        const styledSvgData = createStyledSvg(originalSvgData);
        libraryIcons.push(convertSvgToStyledIcon(styledSvgData, iconName));
      }

      writeLibrary(
        join(
          OUT_DIR,
          family,
          `GMDI-${capitalize(family)} ${capitalize(category)} (${version}).xml`
        ),
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
  await rm(OUT_DIR, { recursive: true, force: true });
  const metadata = await loadMetaData("test/metadata.json");
  const fileTree = constructFileTree(metadata);
  createLibraries(fileTree);
})();
