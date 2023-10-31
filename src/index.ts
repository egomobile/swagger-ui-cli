/**
 * swagger-ui-cli - Standalone Swagger UI server
 * Copyright (C) 2021  Next.e.GO Mobile SE, Aachen, Germany
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// THIS HAS TO BE VERY FIRST!
import cli, { exitWith } from "./cli.js";

import http_request from "./request.js";
import isDocker from "is-docker";
import open from "open";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import toml from "@iarna/toml";
import yaml from "js-yaml";
import { createServer, Server } from "http";
import { DEFAULT_CHARSET, DocumentReader, ExitCode } from "./contracts.js";
import { withSpinner } from "./utils.js";
import { createHttpDocReader, createLocalFileDocReader } from "./docs.js";
import { swaggerDocuments } from "./globals.js";

interface ILoadDocumentOptions {
    pathOrUri: string;
}


function getSafeFilename(name: string): string {
    if (name === "") {
        name = "swagger";
    }

    return sanitizeFilename(name.trim());
}

function loadDocument(options: ILoadDocumentOptions): Promise<any> {
    const { pathOrUri } = options;

    let docReader: DocumentReader | false = false;

    let swaggerFile = pathOrUri;
    if (swaggerFile !== "") {
        if (swaggerFile.startsWith("https://") || swaggerFile.startsWith("http://")) {
            // download from HTTP server
            docReader = createHttpDocReader({
                "swaggerUri": swaggerFile
            });
        }
        else {
            // local file
            if (!path.isAbsolute(swaggerFile)) {
                swaggerFile = path.join(process.cwd(), swaggerFile);
            }

            docReader = createLocalFileDocReader(swaggerFile);
        }
    }

    if (!docReader) {
        noSwaggerFile();
    }

    return (docReader as DocumentReader)();
}

function noSwaggerFile() {
    exitWith(ExitCode.NoDocumentDefined, "Please define at least one file with a Swagger documentation!");
}

async function run() {
    if (process.argv.length < 3) {
        cli.showHelp(ExitCode.ShowHelp);
    }

    const shouldNotOpen = cli.flags.doNotOpen as boolean;
    const port = cli.flags.port;

    // TODO: implement HTTPs support
    let createHttpServer: () => Server = () => {
        return createServer(http_request());
    };

    // Swagger document
    {
        let swaggerDoc: any;

        const sources = cli.input
            .map((i: any) => {
                return i.trim();
            })
            .filter((i: string) => {
                return i !== "";
            });

        if (sources.length) {
            // TODO: support more than 1 document
            swaggerDoc = await loadDocument({
                "pathOrUri": sources[0]
            });
        }
        else {
            noSwaggerFile();
        }

        if (typeof swaggerDoc !== "object" || Array.isArray(swaggerDoc)) {
            exitWith(ExitCode.InvalidDocumentType, "Swagger document must be a plain object!");
        }

        // we are currently supporting only 1 document (s. aboves)
        swaggerDocuments[""] = {
            "fileName": getSafeFilename(""),
            "json": cli.flags.json ? Buffer.from(
                JSON.stringify(swaggerDoc), DEFAULT_CHARSET
            ) : null,
            "object": swaggerDoc,
            "toml": cli.flags.toml ? Buffer.from(
                toml.stringify(swaggerDoc), DEFAULT_CHARSET
            ) : null,
            "yaml": cli.flags.yaml ? Buffer.from(
                yaml.dump(swaggerDoc), DEFAULT_CHARSET
            ) : null
        };
    }

    // create and start server
    const server = createHttpServer();
    server.listen(port, () => {
        const localUri = `http://127.0.0.1:${port}`;

        console.log("🏄", "Swagger UI running:");
        console.log(`   * ${localUri}`);

        if (!shouldNotOpen && !isDocker()) {
            withSpinner(`Open Swagger UI from ${localUri}`, async (spinner) => {
                try {
                    await open(localUri);
                }
                catch (error) {
                    spinner.warn(`Could not open ${localUri}: ${error}`);
                }
            }, "📖");
        }
    });
}

run().catch((error) => {
    console.error("🚨", error);

    process.exit(ExitCode.UncaughtError);
});
