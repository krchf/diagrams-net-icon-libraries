import { join } from "path";
import { convertIcon, writeLibrary } from "./tools/diagrams-net";
import {
  constructFileTree,
  loadMetaData,
  readVersion,
} from "./tools/material-icons";

// destination directory for libraries
const OUT_DIR = "icon-libraries";

/** Represents a mapping from family to categories to icons to filename. */
export interface FileTree {
  [familyName: string]: {
    [categoryName: string]: {
      [iconName: string]: string;
    };
  };
}

/** Creates a library for each (family,category)-combination from the specified mapping. */
async function createLibraries(tree: FileTree) {
  const version = await readVersion();

  for (const [family, categoriesObj] of Object.entries(tree)) {
    for (const [category, iconsObj] of Object.entries(categoriesObj)) {
      const libraryIcons = [];

      for (const [iconName, iconFilepath] of Object.entries(iconsObj)) {
        libraryIcons.push(convertIcon(iconFilepath, iconName));
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
  const metadata = await loadMetaData("test/metadata.json");
  const fileTree = constructFileTree(metadata);
  createLibraries(fileTree);
})();
