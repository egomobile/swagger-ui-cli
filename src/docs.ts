/**
 * swagger-ui-cli - Standalone Swagger UI server
 * Copyright (C) 2020  e.GO Digital GmbH, Aachen, Germany
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

import axios from 'axios';
import contentType from 'content-type';
import toml from '@iarna/toml';
import yaml from 'js-yaml';
import { Nilable } from '@egodigital/types';
import { exitWith } from './cli';
import { DocumentReader, DEFAULT_CHARSET, ExitCode, MIME_JSON, MIME_TOML, MIME_YAML, NOT_SUPPORTED, MIME_JAVASCRIPT } from './contracts';
import { withSpinner, readFile, stat } from './utils';
import { executeCode } from './code';

/**
 * Creates a document reader, which reads from HTTP(s) source.
 *
 * @param {string} swaggerUri The source URL.
 *
 * @returns {DocumentReader} The new reader.
 */
export function createHttpDocReader(swaggerUri: string): DocumentReader {
    return async () => {
        // supported content type by file extension
        let supportedTypeByFileExt: Nilable<string>;
        if (swaggerUri.endsWith('.json')) {
            supportedTypeByFileExt = MIME_JSON;
        } else if (swaggerUri.endsWith('.yaml') || swaggerUri.endsWith('.yml')) {
            supportedTypeByFileExt = MIME_YAML;
        } else if (swaggerUri.endsWith('.toml')) {
            supportedTypeByFileExt = MIME_TOML;
        }

        const resp = await withSpinner(
            `Download from ${swaggerUri}`,
            () => axios.get<Buffer>(swaggerUri, {
                responseType: 'arraybuffer'
            })
            , '🚚'
        );

        const getStringData = (enc: string) => {
            try {
                return resp.data.toString(enc);
            } catch { }

            return resp.data.toString(DEFAULT_CHARSET);
        };

        const tryParseDoc = async (type: Nilable<string>, enc = DEFAULT_CHARSET) => {
            if (type?.endsWith('json')) {
                return JSON.parse(getStringData(enc));
            } else if (type?.endsWith('yaml')) {
                return yaml.safeLoad(getStringData(enc));
            } else if (type?.endsWith('toml')) {
                return toml.parse(getStringData(enc));
            } else if (type?.endsWith('javascript')) {
                return executeCode(getStringData(enc));
            }

            return NOT_SUPPORTED;
        };

        let doc: any = NOT_SUPPORTED;

        const contentTypeHeader = resp.headers?.['content-type'];
        if (typeof contentTypeHeader === 'string') {
            const ct = contentType.parse(contentTypeHeader);

            const charset = ct.parameters['charset']?.toLowerCase().trim().split('-').join('');
            const enc = charset || DEFAULT_CHARSET;

            let type: Nilable<string> = ct.type?.toLowerCase().trim();
            if (type?.endsWith('json')) {
                type = MIME_JSON;
            } else if (type?.endsWith('yaml')) {
                type = MIME_YAML;
            } else if (type?.endsWith('toml')) {
                type = MIME_TOML;
            } else if (type?.endsWith('javascript')) {
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
            exitWith(ExitCode.InvalidDocumentFormat, `${swaggerUri} must be of one of the following types: json, toml, yaml, yml!`);
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

        if (swaggerFile.endsWith('.json')) {
            return JSON.parse(await readFile(swaggerFile, DEFAULT_CHARSET));
        } else if (swaggerFile.endsWith('.yaml') || swaggerFile.endsWith('.yml')) {
            return yaml.safeLoad(await readFile(swaggerFile, DEFAULT_CHARSET));
        } else if (swaggerFile.endsWith('.toml')) {
            return toml.parse(await readFile(swaggerFile, DEFAULT_CHARSET));
        } else if (swaggerFile.endsWith('.js')) {
            return executeCode(await readFile(swaggerFile, DEFAULT_CHARSET));
        }

        exitWith(ExitCode.InvalidDocumentFormat, `${swaggerFile} must have one of the following file extensions: json, toml, yaml, yml!`);
    };
}
