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

import crypto from "crypto";
import mrmime from "mrmime";
import path from "path";
import type { IncomingMessage, OutgoingHttpHeaders, RequestListener, ServerResponse } from "http";
import { getAbsoluteFSPath } from "swagger-ui-dist";
import { CONTENT_TYPE_JAVASCRIPT, CONTENT_TYPE_JSON, CONTENT_TYPE_TOML, CONTENT_TYPE_YAML, DEFAULT_CHARSET, DEFAULT_CHARSET_HTTP, IFileCacheEntry } from "./contracts";
import { swaggerDocuments } from "./globals";
import { defaultFavIcon, indexHtml as indexHtmlTpl, swaggerUiInit as swaggerUiInitTpl } from "./templates";
import { exists, hashData, normalizePath, readFile, stat } from "./utils";

const fileCache: { [path: string]: IFileCacheEntry; } = {};
const swaggerUIDir = path.resolve(getAbsoluteFSPath());

/**
 * Creates a new HTTP request handler.
 *
 * @returns {RequestListener} The new handler.
 */
export default (): RequestListener => {
    const lastModified = new Date().toUTCString();
    const etagPrefix = `${hashData(Buffer.from(lastModified, "utf8"))}-${crypto.randomBytes(4).toString("hex")}-`;

    const createHeaders = (headers: OutgoingHttpHeaders): OutgoingHttpHeaders => {
        return {
            "Last-Modified": lastModified,
            ...headers
        };
    };

    const etag = (data: Buffer, hash?: string): OutgoingHttpHeaders => {
        if (typeof hash !== "string") {
            hash = hashData(data);
        }

        return {
            "Content-Length": data.length,
            "ETag": `"${etagPrefix}${hash}"`
        };
    };

    const indexHtml = Buffer.from(
        indexHtmlTpl.replace("<% title %>", "Swagger UI")
            .replace("<% favIconString %>", defaultFavIcon)
            // .replace('<% customJsUrl %>', jsUrl ? `<script src="${jsUrl}"></script>` : '')
            .replace("<% customJsUrl %>", "")
            // .replace('<% customCssUrl %>', cssUrl ? `<link href="${cssUrl}" rel="stylesheet">` : '')
            .replace("<% customCssUrl %>", "")
            .replace("<% customCss %>", "")
            // .replace('<% customJs %>', customJs ? `<script> ${customJs} </script>` : '')
            .replace("<% customJs %>", "")
        , DEFAULT_CHARSET
    );
    const indexHtmlContentType = `text/html; charset=${DEFAULT_CHARSET_HTTP}`;
    const indexHtmlHash = hashData(indexHtml);

    return async (req: IncomingMessage, res: ServerResponse) => {
        try {
            for (const name in swaggerDocuments) {
                const basePath = "/" + name;

                const url = req.url?.split(path.sep).join("/").trim();
                if (!url?.startsWith(basePath)) {
                    continue;
                }

                const relUrl = normalizePath(url.substr(basePath.length));

                const swaggerDoc = swaggerDocuments[name];
                const contentDisposition = (ext: string): OutgoingHttpHeaders => {
                    return {
                        "Content-Disposition": `attachment; filename="${swaggerDoc.fileName}.${ext}`
                    };
                };

                // index.html
                if (["/", "/index.html"].includes(relUrl)) {
                    res.writeHead(200, createHeaders({
                        ...etag(indexHtml, indexHtmlHash),
                        "Content-Type": indexHtmlContentType
                    }));
                    res.end(indexHtml);

                    return;
                }

                // swagger-ui-init.js
                if (relUrl.startsWith("/swagger-ui-init.js")) {
                    const js = Buffer.from(
                        swaggerUiInitTpl.replace("<% swaggerOptions %>", `var options = ${JSON.stringify({
                            // swaggerDoc: options.document || undefined,
                            "swaggerDoc": swaggerDoc.object,
                            // customOptions: options.uiOptions || {},
                            "customOptions": {},
                            "swaggerUrl": basePath + "/json"
                        })}`), DEFAULT_CHARSET
                    );

                    res.writeHead(200, createHeaders({
                        ...etag(js),
                        "Content-Type": CONTENT_TYPE_JAVASCRIPT
                    }));
                    res.end(js);

                    return;
                }

                // JSON download?
                if (swaggerDoc.json) {
                    if (relUrl.startsWith("/json")) {
                        res.writeHead(200, createHeaders({
                            ...etag(swaggerDoc.json),
                            "Content-Type": CONTENT_TYPE_JSON,
                            ...contentDisposition("json")
                        }));
                        res.end(swaggerDoc.json);

                        return;
                    }
                }

                // YAML download?
                if (swaggerDoc.yaml) {
                    if (relUrl.startsWith("/yaml")) {
                        res.writeHead(200, createHeaders({
                            ...etag(swaggerDoc.yaml),
                            "Content-Type": CONTENT_TYPE_YAML,
                            ...contentDisposition("yaml")
                        }));
                        res.end(swaggerDoc.yaml);

                        return;
                    }
                }

                // TOML download
                if (swaggerDoc.toml) {
                    if (relUrl.startsWith("/toml")) {
                        res.writeHead(200, createHeaders({
                            ...etag(swaggerDoc.toml),
                            "Content-Type": CONTENT_TYPE_TOML,
                            ...contentDisposition("toml")
                        }));
                        res.end(swaggerDoc.toml);

                        return;
                    }
                }

                const pathname = relUrl.substring(0, relUrl.indexOf('?') < 0 ? relUrl.length : relUrl.indexOf('?'))
                const file = path.resolve(
                    path.join(swaggerUIDir, pathname)
                );

                let cacheEntry = fileCache[file];
                const sendCacheEntry = () => {
                    res.writeHead(200, createHeaders({
                        ...etag(cacheEntry.content, cacheEntry.hash),
                        "Content-Type": cacheEntry.mime
                    }));
                    res.end(cacheEntry.content);
                };

                if (!cacheEntry) {
                    if (file.startsWith(swaggerUIDir + path.sep)) {
                        if (await exists(file)) {
                            const fileStat = await stat(file);
                            if (fileStat.isFile()) {
                                const content = await readFile(file);
                                const mime = mrmime.lookup(file) || "application/octet-stream";
                                const hash = hashData(content);

                                fileCache[file] = cacheEntry = {
                                    content,
                                    hash,
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
        catch (error) {
            console.error("[ERROR]", error);

            if (!res.headersSent) {
                res.writeHead(500);
            }

            res.end();
        }
    };
};