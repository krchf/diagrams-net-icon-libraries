import { rm, writeFile } from "fs/promises";
import { join } from "path";
import {
  convertSvgToStyledIcon,
  writeDiagramsNetLibrary,
} from "./tools/diagrams-net";
import { parseMaterialDesignIconCollection } from "./icon-collections/material-icons";

// destination directory for libraries
const OUT_DIR = "dist/icon-libraries";

// all loaders for icon collections
const collectionLoaders: CollectionLoaderFn[] = [
  parseMaterialDesignIconCollection,
];

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

  /** Information regarding licensing */
  license: {
    /** Commonly used name of the license. */
    name: string;
    /** Summary of the license. */
    summary: string;
    /** URL which states the license. */
    source: string;
  };

  /** Mapping from _family_ to _categories_ to list of associated _icon names_. */
  icons: {
    [familyName: string]: {
      [categoryName: string]: string[];
    };
  };
}

/** Represents a function which returns an icon collection. */
export type CollectionLoaderFn = () => Promise<IconCollection>;

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

      const libraryFilename = deriveLibraryFilename(
        collection.name,
        family,
        category
      );

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

/**
 * Derives the filename of a library.
 *
 * @param collectionName Name of the collection.
 * @param family Family the library is for.
 * @param category Category the library is for.
 * @returns The filename with file extension.
 */
function deriveLibraryFilename(
  collectionName: string,
  family: string,
  category: string
) {
  return `${collectionName}-${capitalize(family)}-${capitalize(category)}.xml`;
}

/**
 * Generates the instructions for a set of icon collections.
 *
 * @param collections Collections to generate instructions for.
 * @returns Markdown string with instructions.
 */
function generateInstructionsMarkdown(collections: IconCollection[]): string {
  let md = `# Add Google's Material Icons to https://app.diagrams.net\n\n`;
  md += `> Disclaimer: This project is not affiliated with _Material Design Icons_ by Google or _diagrams.net_ (formerly _draw.io_) by JGraph!\n\n`;
  md += `**Click one of the links below to add the icon library to https://app.diagrams.net**\n\n`;

  for (const collection of collections) {
    md += `## ${collection.name}\n\n`;
    md += `License: ${collection.license.name}\n\n`;
    md += `> ${collection.license.summary}\n`;
    md += `>\n> -- _${collection.license.source}_`;

    for (const [family, categoriesObj] of Object.entries(collection.icons)) {
      md += `\n\n ### ${capitalize(family)}\n\n`;
      for (const category of Object.keys(categoriesObj).sort()) {
        md += `- [${capitalize(
          category
        )}](https://app.diagrams.net/?splash=0&clibs=U${encodeURI(
          `https://raw.githubusercontent.com/krchf/diagrams-net-icon-libraries/main/dist/icon-libraries/${
            collection.name
          }/${family}/${deriveLibraryFilename(
            collection.name,
            family,
            category
          )})`
        )} (${collection.icons[family][category].length} icons)\n`;
      }
    }
  }

  return md;
}

(async () => {
  // remove any old files
  await rm(OUT_DIR, { recursive: true, force: true });

  const collections: IconCollection[] = [];

  for (const loadCollection of collectionLoaders) {
    // create collection and diagrams.net libraries
    const collection = await loadCollection();
    collections.push(collection);
    await createLibraries(collection);
  }

  // generate instructions
  console.log("Writing instructions ...");
  await writeFile(
    join(OUT_DIR, "README.md"),
    generateInstructionsMarkdown(collections)
  );

  console.log("Done!");
})();
