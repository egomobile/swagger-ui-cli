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
import cli, { exitWith } from "./cli";

import http_request from "./request";
import isDocker from "is-docker";
import open from "open";
import path from "path";
const sanitizeFilename = require("sanitize-filename");
import toml from "@iarna/toml";
import yaml from "js-yaml";
import { createServer, Server } from "http";
import { DEFAULT_CHARSET, DocumentReader, ExitCode } from "./contracts";
import { withSpinner } from "./utils";
import { createHttpDocReader, createLocalFileDocReader } from "./docs";
import { swaggerDocuments } from "./globals";


function getSafeFilename(name: string): string {
    if (name === "") {
        name = "swagger";
    }

    return sanitizeFilename(name.trim());
}

function loadDocument(pathOrUri: string): Promise<any> {
    let docReader: DocumentReader | false = false;

    let swaggerFile = pathOrUri;
    if (swaggerFile !== "") {
        if (swaggerFile.startsWith("https://") || swaggerFile.startsWith("http://")) {
            // download from HTTP server
            docReader = createHttpDocReader(swaggerFile);
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
            .map(i => {
                return i.trim();
            })
            .filter(i => {
                return i !== "";
            });

        if (sources.length) {
            // TODO: support more than 1 document
            swaggerDoc = await loadDocument(sources[0]);
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
            "json": cli.flags.noJson ? null : Buffer.from(
                JSON.stringify(swaggerDoc), DEFAULT_CHARSET
            ),
            "object": swaggerDoc,
            "toml": cli.flags.noToml ? null : Buffer.from(
                toml.stringify(swaggerDoc), DEFAULT_CHARSET
            ),
            "yaml": cli.flags.noYaml ? null : Buffer.from(
                yaml.dump(swaggerDoc), DEFAULT_CHARSET
            )
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