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
import cli from "./cli.js";

import axios, { AxiosBasicCredentials } from "axios";
import contentType from "content-type";
import toml from "@iarna/toml";
import yaml from "js-yaml";
import type { Nilable, Optional } from "@egomobile/types";
import { exitWith } from "./cli.js";
import { DocumentReader, DEFAULT_CHARSET, ExitCode, MIME_JSON, MIME_TOML, MIME_YAML, NOT_SUPPORTED, MIME_JAVASCRIPT } from "./contracts.js";
import { withSpinner, readFile, stat } from "./utils.js";
import { executeCode } from "./code.js";

const canExecuteScripts = cli.flags.allowScripts as boolean;

/**
 * Options for `createHttpDocReader()` function.
 */
export interface ICreateHttpDocReaderOptions {
    /**
     * The Swagger UI.
     */
    swaggerUri: string;
}

/**
 * Creates a document reader, which reads from HTTP(s) source.
 *
 * @param {ICreateHttpDocReaderOptions} options The options.
 *
 * @returns {DocumentReader} The new reader.
 */
export function createHttpDocReader(options: ICreateHttpDocReaderOptions): DocumentReader {
    const { swaggerUri } = options;

    return async () => {
        // supported content type by file extension
        let supportedTypeByFileExt: Nilable<string>;
        if (swaggerUri.endsWith(".json")) {
            supportedTypeByFileExt = MIME_JSON;
        }
        else if (swaggerUri.endsWith(".yaml") || swaggerUri.endsWith(".yml")) {
            supportedTypeByFileExt = MIME_YAML;
        }
        else if (swaggerUri.endsWith(".toml")) {
            supportedTypeByFileExt = MIME_TOML;
        }
        else if (swaggerUri.endsWith(".js")) {
            supportedTypeByFileExt = MIME_JAVASCRIPT;
        }

        const resp = await withSpinner(
            `Download from ${swaggerUri}`,
            () => {
                let auth: Optional<AxiosBasicCredentials>;
                if (cli.flags.username?.length || cli.flags.password?.length) {
                    auth = {
                        "username": cli.flags.username ?? "",
                        "password": cli.flags.password ?? ""
                    };
                }

                return axios.get<Buffer>(swaggerUri, {
                    "responseType": "arraybuffer",
                    auth
                });
            }
            , "🚚"
        );

        const getStringData = (enc: string) => {
            try {
                return resp.data.toString(enc as BufferEncoding);
            }
            catch { }

            return resp.data.toString(DEFAULT_CHARSET);
        };

        const tryParseDoc = async (type: Nilable<string>, enc = DEFAULT_CHARSET) => {
            if (type?.endsWith("json")) {
                return JSON.parse(getStringData(enc));
            }
            else if (type?.endsWith("yaml")) {
                return yaml.load(getStringData(enc));
            }
            else if (type?.endsWith("toml")) {
                return toml.parse(getStringData(enc));
            }
            else if (canExecuteScripts && type?.endsWith("javascript")) {
                return await executeCode(getStringData(enc));
            }

            return NOT_SUPPORTED;
        };

        let doc: any = NOT_SUPPORTED;

        const contentTypeHeader = resp.headers?.["content-type"];
        if (typeof contentTypeHeader === "string") {
            const ct = contentType.parse(contentTypeHeader);

            const charset = ct.parameters["charset"]?.toLowerCase().trim().split("-").join("");
            const enc = charset || DEFAULT_CHARSET;

            let type: Nilable<string> = ct.type?.toLowerCase().trim();
            if (type?.endsWith("json")) {
                type = MIME_JSON;
            }
            else if (type?.endsWith("yaml")) {
                type = MIME_YAML;
            }
            else if (type?.endsWith("toml")) {
                type = MIME_TOML;
            }
            else if (type?.endsWith("javascript")) {
                type = MIME_JAVASCRIPT;
            }

            // try parse by content type
            doc = await tryParseDoc(type, enc);
        }

        if (doc === NOT_SUPPORTED) {
            // now try by file extension
            doc = await tryParseDoc(supportedTypeByFileExt);
        }

        if (doc === NOT_SUPPORTED) {
            showInvalidDocumentError(swaggerUri);
        }

        return doc;
    };
}

/**
 * Creates a document reader, which reads from HTTP(s) source.
 *
 * @param {string} swaggerFile The path to Swagger document file.
 *
 * @returns {DocumentReader} The new reader.
 */
export function createLocalFileDocReader(swaggerFile: string): DocumentReader {
    return async () => {
        const swaggerFileStat = await stat(swaggerFile);
        if (!swaggerFileStat.isFile()) {
            exitWith(ExitCode.NoFile, `${swaggerFile} is no file!`);
        }

        if (swaggerFile.endsWith(".json")) {
            return JSON.parse(await readFile(swaggerFile, DEFAULT_CHARSET));
        }
        else if (swaggerFile.endsWith(".yaml") || swaggerFile.endsWith(".yml")) {
            return yaml.load(await readFile(swaggerFile, DEFAULT_CHARSET));
        }
        else if (swaggerFile.endsWith(".toml")) {
            return toml.parse(await readFile(swaggerFile, DEFAULT_CHARSET));
        }
        else if (canExecuteScripts && swaggerFile.endsWith(".js")) {
            return executeCode(await readFile(swaggerFile, DEFAULT_CHARSET));
        }

        showInvalidDocumentError(swaggerFile);
    };
}

function showInvalidDocumentError(pathOrUri: string) {
    const allowedExtensions: string[] = ["json", "toml", "yaml", "yml"];
    if (canExecuteScripts) {
        allowedExtensions.unshift("js");
    }

    exitWith(
        ExitCode.InvalidDocumentFormat,
        `${pathOrUri} must be of one of the following types: ${allowedExtensions.join(", ")}!`
    );
}
