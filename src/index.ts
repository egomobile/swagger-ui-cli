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
import fs from 'fs';
import isDocker from 'is-docker';
import meow from 'meow';
import mimeTypes from 'mime-types';
import open from 'open';
import ora from 'ora';
import path from 'path';
const sanitizeFilename = require('sanitize-filename');
import toml from '@iarna/toml';
import yaml from 'js-yaml';
import { Nilable } from '@egodigital/types';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { getAbsoluteFSPath } from 'swagger-ui-dist';
import { promisify } from 'util';
import { defaultFavIcon, indexHtml, swaggerUiInit } from './templates';

type DocumentReader = () => Promise<any>;

interface IFileCacheEntry {
    content: Buffer;
    mime: string;
}

interface ISwaggerDocument {
    fileName: string;
    json: Buffer;
    object: object;
    toml: Buffer;
    yaml: Buffer;
}

enum ExitCode {
    OK = 0,
    UncaughtError = 1,
    ShowHelp = 2,
    NoDocumentDefined = 3,
    InvalidPortValue = 4,
    InvalidDocumentFormat = 5,
    InvalidDocumentType = 6,
    NoFile = 7
}

const DEFAULT_CHARSET = 'utf8';
const DEFAULT_CHARSET_HTTP = 'utf-8';
const MIME_JSON = 'application/json';
const MIME_TOML = 'application/toml';
const MIME_YAML = 'application/x-yaml';
const NOT_SUPPORTED = Symbol('NOT_SUPPORTED');

const fileCache: { [path: string]: IFileCacheEntry } = {};
const swaggerDocuments: { [name: string]: ISwaggerDocument } = {};
const swaggerUIDir = path.resolve(getAbsoluteFSPath());
let customUrlInSwaggerUI: string | false = false;

const exists = promisify(fs.exists);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

const cli = meow(`
Usage
  $ swagger-ui [options] <file>

Options
  --do-not-open   Do not open local URL after server has been started. Default: (false)
  --port, -p      The custom TCP port. Default: 8080

<file> The source document as local file path or URL. Supports JSON, YAML and TOML.

Examples
  Starts a new server instance on port 8080 for a new file
  $ swagger-ui swaggerFile.yaml

  Using port 8181 and load document from HTTP server
  $ swagger-ui --port=8181 https://petstore.swagger.io/v2/swagger.json

  Do not open browser, after server has been started
  $ swagger-ui https://example.com/my-api.toml --do-not-open
`, {
    flags: {
        'do-not-open': {
            type: 'boolean',
            default: false,
            isRequired: false
        },
        port: {
            type: 'number',
            alias: 'p',
            default: 8080,
            isRequired: false
        }
    }
});

function createHttpDocReader(swaggerUri: string): DocumentReader {
    return async () => {
        customUrlInSwaggerUI = swaggerUri;

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

        const tryParseDoc = (type: Nilable<string>, enc = DEFAULT_CHARSET) => {
            if (type?.endsWith('json')) {
                return JSON.parse(getStringData(enc));
            } else if (type?.endsWith('yaml')) {
                return yaml.safeLoad(getStringData(enc));
            } else if (type?.endsWith('toml')) {
                return toml.parse(getStringData(enc));
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
            }

            // try parse by content type
            doc = tryParseDoc(type, enc);
        }

        if (doc === NOT_SUPPORTED) {
            // now try by file extension
            doc = tryParseDoc(supportedTypeByFileExt);
        }

        if (doc === NOT_SUPPORTED) {
            exitWith(ExitCode.InvalidDocumentFormat, `${swaggerUri} must be of one of the following types: json, toml, yaml, yml!`);
        }

        return doc;
    };
}

function createLocalFileDocReader(swaggerFile: string): DocumentReader {
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
        }

        exitWith(ExitCode.InvalidDocumentFormat, `${swaggerFile} must have one of the following file extensions: json, toml, yaml, yml!`);
    };
}

function exitWith(code: ExitCode, msg: any) {
    console.log('🛑', msg);

    console.log('');
    cli.showHelp(code);
}

function getSafeFilename(name: string): string {
    if (name === '') {
        name = 'swagger';
    }

    return sanitizeFilename(name.trim());
}

async function handleHttpRequest(req: IncomingMessage, res: ServerResponse) {
    for (const name in swaggerDocuments) {
        const basePath = '/' + name;

        const url = req.url?.split(path.sep).join('/').trim();
        if (!url?.startsWith(basePath)) {
            continue;
        }

        const relUrl = normalizePath(url.substr(basePath.length));

        const swaggerDoc = swaggerDocuments[name];

        // index.html
        if (['/', '/index.html'].includes(relUrl)) {
            const html = Buffer.from(
                indexHtml.replace('<% title %>', 'Swagger UI')
                    .replace('<% favIconString %>', defaultFavIcon)
                    // .replace('<% customJsUrl %>', jsUrl ? `<script src="${jsUrl}"></script>` : '')
                    .replace('<% customJsUrl %>', '')
                    // .replace('<% customCssUrl %>', cssUrl ? `<link href="${cssUrl}" rel="stylesheet">` : '')
                    .replace('<% customCssUrl %>', '')
                    .replace('<% customCss %>', '')
                    // .replace('<% customJs %>', customJs ? `<script> ${customJs} </script>` : '')
                    .replace('<% customJs %>', '')
                , DEFAULT_CHARSET
            );

            res.writeHead(200, {
                'Content-Length': String(html.length),
                'Content-Type': `text/html; charset=${DEFAULT_CHARSET_HTTP}`
            });
            res.end(html);

            return;
        }

        // swagger-ui-init.js
        if (relUrl.startsWith('/swagger-ui-init.js')) {
            const js = Buffer.from(
                swaggerUiInit.replace('<% swaggerOptions %>', `var options = ${JSON.stringify({
                    // swaggerDoc: options.document || undefined,
                    swaggerDoc: swaggerDoc.object,
                    // customOptions: options.uiOptions || {},
                    customOptions: {},
                    swaggerUrl: customUrlInSwaggerUI || (basePath + '/json')
                })}`), DEFAULT_CHARSET
            );

            res.writeHead(200, {
                'Content-Length': String(js.length),
                'Content-Type': `${MIME_JSON}; charset=${DEFAULT_CHARSET_HTTP}`
            });
            res.end(js);

            return;
        }

        // JSON download
        if (relUrl.startsWith('/json')) {
            res.writeHead(200, {
                'Content-Length': swaggerDoc.json.length,
                'Content-Type': `${MIME_JSON}; charset=${DEFAULT_CHARSET_HTTP}`,
                'Content-Disposition': `attachment; filename="${swaggerDoc.fileName}.json`
            });
            res.end(swaggerDoc.json);

            return;
        }

        // YAML download
        if (relUrl.startsWith('/yaml')) {
            res.writeHead(200, {
                'Content-Length': swaggerDoc.yaml.length,
                'Content-Type': `${MIME_YAML}; charset=${DEFAULT_CHARSET_HTTP}`,
                'Content-Disposition': `attachment; filename="${swaggerDoc.fileName}.yaml`
            });
            res.end(swaggerDoc.yaml);

            return;
        }

        // TOML download
        if (relUrl.startsWith('/toml')) {
            res.writeHead(200, {
                'Content-Length': swaggerDoc.toml.length,
                'Content-Type': `${MIME_TOML}; charset=${DEFAULT_CHARSET_HTTP}`,
                'Content-Disposition': `attachment; filename="${swaggerDoc.fileName}.toml`
            });
            res.end(swaggerDoc.toml);

            return;
        }

        const file = path.resolve(
            path.join(swaggerUIDir, relUrl)
        );

        let cacheEntry = fileCache[file];
        const sendCacheEntry = () => {
            res.writeHead(200, {
                'Content-Length': String(cacheEntry.content.length),
                'Content-Type': cacheEntry.mime
            });
            res.end(cacheEntry.content);
        };

        if (!cacheEntry) {
            if (file.startsWith(swaggerUIDir + path.sep)) {
                if (await exists(file)) {
                    const fileStat = await stat(file);
                    if (fileStat.isFile()) {
                        const content = await readFile(file);
                        const mime = mimeTypes.lookup(file) || 'application/octet-stream';

                        fileCache[file] = cacheEntry = {
                            content,
                            mime
                        };
                    }
                }
            }
        }

        if (cacheEntry) {
            sendCacheEntry();
            return;
        }

        break;
    }

    res.writeHead(404);
    res.end();
}

function loadDocument(pathOrUri: string): Promise<any> {
    let docReader: DocumentReader | false = false;

    let swaggerFile = pathOrUri;
    if (swaggerFile !== '') {
        if (swaggerFile.startsWith('https://') || swaggerFile.startsWith('http://')) {
            // download from HTTP server
            docReader = createHttpDocReader(swaggerFile);
        } else {
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

function normalizePath(p: Nilable<string>): string {
    if (p === null || typeof p === 'undefined') {
        p = '';
    } else {
        p = String(p);
    }

    p = p.trim().split(path.sep).join('/');

    while (p.endsWith('/')) {
        p = p.substr(0, p.length - 1).trim();
    }

    if (!p.startsWith('/')) {
        p = '/' + p;
    }

    return p;
}

function noSwaggerFile() {
    exitWith(ExitCode.NoDocumentDefined, 'Please define at least one file with a Swagger documentation!');
}

async function run() {
    if (process.argv.length < 3) {
        cli.showHelp(ExitCode.ShowHelp);
    }

    const shouldNotOpen = cli.flags.doNotOpen as boolean;
    const port = cli.flags.port;

    let createHttpServer: () => Server = () => createServer(handleHttpRequest);

    // Swagger document
    {
        let swaggerDoc: any;

        const sources = cli.input
            .map(i => i.trim())
            .filter(i => i !== '');

        if (sources.length) {
            swaggerDoc = await loadDocument(sources[0]);
        } else {
            noSwaggerFile();
        }

        if (typeof swaggerDoc !== 'object' || Array.isArray(swaggerDoc)) {
            exitWith(ExitCode.InvalidDocumentType, 'Swagger document must be a plain object!');
        }

        swaggerDocuments[''] = {
            fileName: getSafeFilename(''),
            json: Buffer.from(
                JSON.stringify(swaggerDoc), DEFAULT_CHARSET
            ),
            object: swaggerDoc,
            toml: Buffer.from(
                toml.stringify(swaggerDoc), DEFAULT_CHARSET
            ),
            yaml: Buffer.from(
                yaml.safeDump(swaggerDoc), DEFAULT_CHARSET
            )
        };
    }

    // create and start server
    const server = createHttpServer();
    server.listen(port, () => {
        const localUri = `http://127.0.0.1:${port}`;

        console.log('🏄', 'Swagger UI running:');
        console.log(`   * ${localUri}`);

        if (!shouldNotOpen && !isDocker()) {
            withSpinner(`Open Swagger UI from ${localUri}`, async (spinner) => {
                try {
                    await open(localUri);
                } catch (e) {
                    spinner.warn(`Could not open ${localUri}: ${e}`);
                }
            }, '📖');
        }
    });
}

async function withSpinner<TResult extends any = any>(
    text: string,
    action: (spinner: ora.Ora) => Promise<TResult>,
    symbol = '✅'
) {
    const spinner = ora(text);

    try {
        spinner.start();

        const result = await action(spinner);
        spinner.stopAndPersist({ symbol });

        return result;
    } catch (e) {
        spinner.fail(`${text}: ${e}`);

        process.exit(ExitCode.UncaughtError);
    }
}

run().catch(err => {
    console.error('🚨', err);

    process.exit(ExitCode.UncaughtError);
});
