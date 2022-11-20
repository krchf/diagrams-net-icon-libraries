import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import {
  convertSvgToStyledIcon,
  writeDiagramsNetLibrary,
} from "./tools/diagrams-net";
import { parseMaterialDesignIconCollection } from "./icon-collections/material-icons";

// destination directory for libraries
const OUT_DIR = "dist/icon-libraries";

// URL for library download
const DOWNLOAD_BASE_URL =
  "https://raw.githubusercontent.com/krchf/diagrams-net-icon-libraries/main";

// all loaders for icon collections
const collectionLoaders: CollectionLoaderFn[] = [
  parseMaterialDesignIconCollection,
];

/** Represents a function returning an icon's SVG data given a family, category and icon name. */
export type IconLoaderFn = (
  family: string,
  category: string,
  iconName: string
) => Promise<string | undefined>;

/** Internal representation of an icon collection. */
export interface IconCollection {
  /** Name of the icon collection. */
  name: string;

  /** Version of the icon collection. */
  version: string;

  /** Function to load icons from disk. */
  loaderFn: IconLoaderFn;

  /** URL with further information about icon collection. */
  website: string;

  /** Website of collection creator. */
  author: {
    /** Display name. */
    name: string;

    /** Optional link to creator's website. */
    website?: string;
  };

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

/** Contains statistics collected during creation of libraries. */
interface LibraryCreationStatistics {
  icons: {
    /** Number of successfully processed icons. */
    success: number;
    /** Number of  icons with error during processing. */
    error: number;
  };
}

/** Represents a function which returns an icon collection. */
export type CollectionLoaderFn = () => Promise<IconCollection>;

/** Creates a library for each (family,category)-combination from the specified collection. */
async function createLibraries(
  collection: IconCollection
): Promise<LibraryCreationStatistics> {
  console.log("Handling", collection.name, collection.version);
  const stats: LibraryCreationStatistics = { icons: { success: 0, error: 0 } };

  for (const [family, categoriesObj] of Object.entries(collection.icons)) {
    console.log("Handling family", family);
    for (const [category, icons] of Object.entries(categoriesObj)) {
      console.log("Handling category", category);
      const libraryIcons = [];

      for (const iconName of icons) {
        const svgData = await collection.loaderFn(family, category, iconName);
        if (svgData) {
          libraryIcons.push(convertSvgToStyledIcon(svgData, iconName));
          stats.icons.success += 1;
        } else {
          console.warn(
            `Undefined data for icon ${iconName} (from family "${family}", category "${category}")`
          );
          stats.icons.error += 1;
        }
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

  return stats;
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
  let md = `# Icon libraries for diagrams.net/draw.io\n\n`;
  md += `> Disclaimer: This project is not affiliated with JGraph or any icon creator such as Google!\n\n`;
  md += `_Last updated: ${new Date().toUTCString()}_\n\n\n`;
  md +=
    "Users of https://app.diagrams.net can add the libraries with a single click. Users of the desktop app need to download the library and import it via `File > Open Library`.\n";

  for (const collection of collections) {
    md += `## ${collection.name}\n\n`;
    md += "| Overview | |\n|-|-|\n";
    md += `| Version | ${collection.version} |\n`;
    md += `| Author | [${collection.author.name}](${
      collection.author.website || collection.website
    }) |\n`;
    md += `| Families | ${Object.keys(collection.icons)
      .map((family) => `[${capitalize(family)}](#${family})`)
      .join(", ")} |\n`;
    md += `| Website | [${collection.website}](${collection.website}) |\n`;
    md += `| License | ${collection.license.name} |\n`;
    md += `> ${collection.license.summary}\n`;
    md += `>\n> -- _${collection.license.source}_`;

    for (const [family, categoriesObj] of Object.entries(collection.icons)) {
      md += `\n\n ### ${capitalize(family)}\n`;
      for (const category of Object.keys(categoriesObj).sort()) {
        const fileUrl = `${DOWNLOAD_BASE_URL}/dist/icon-libraries/${
          collection.name
        }/${family}/${deriveLibraryFilename(
          collection.name,
          family,
          category
        )}`;
        md += `- ${capitalize(category)} (${
          collection.icons[family][category].length
        } icons) `;
        md += `[ [Add to app.diagrams.net](https://app.diagrams.net/?splash=0&clibs=U${encodeURI(
          fileUrl
        )})\n`;
        md += `| [Download for desktop app](${fileUrl}) ]\n`;
      }
    }
  }

  return md;
}

(async () => {
  // remove any old files
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const collections: IconCollection[] = [];

  for (const loadCollection of collectionLoaders) {
    // create collection and diagrams.net libraries
    const collection = await loadCollection();
    collections.push(collection);
    const stats = await createLibraries(collection);
    console.log(
      `Finished processing of collection ${collection.name} (${stats.icons.success} icons processed successfully, ${stats.icons.error} icons processed with error)`
    );
  }

  // generate instructions
  console.log("Writing instructions ...");
  await writeFile(
    join(OUT_DIR, "README.md"),
    generateInstructionsMarkdown(collections)
  );

  console.log("Done!");
})();
