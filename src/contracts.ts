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

/**
 * A document reader function.
 *
 * @returns {Promise<any>} The promise with the document.
 */
export type DocumentReader = () => Promise<any>;

/**
 * An entry for a file cache.
 */
export interface IFileCacheEntry {
    /**
     * The content.
     */
    content: Buffer;
    /**
     * The SHA-256 hash.
     */
    hash: string;
    /**
     * The MIME type.
     */
    mime: string;
}

/**
 * A Swagger document context.
 */
export interface ISwaggerDocumentContext {
    /**
     * The (base) filename without extension.
     */
    fileName: string;
    /**
     * Swagger document as JSON string.
     */
    json: Buffer;
    /**
     * The Swagger document.
     */
    object: object;
    /**
     * Swagger document as TOML string.
     */
    toml: Buffer;
    /**
     * Swagger document as YAML string.
     */
    yaml: Buffer;
}

/**
 * List of known exit codes.
 */
export enum ExitCode {
    /**
     * OK
     */
    OK = 0,
    /**
     * Unhandled error
     */
    UncaughtError = 1,
    /**
     * Showed help
     */
    ShowHelp = 2,
    /**
     * No document source defined
     */
    NoDocumentDefined = 3,
    /**
     * Invalid port value.
     */
    InvalidPortValue = 4,
    /**
     * Invalid document format
     */
    InvalidDocumentFormat = 5,
    /**
     * Invalid document type
     */
    InvalidDocumentType = 6,
    /**
     * Document source is no file
     */
    NoFile = 7
}

/**
 * Defualt charset
 */
export const DEFAULT_CHARSET = 'utf8';
/**
 * Default charset (HTTP header)
 */
export const DEFAULT_CHARSET_HTTP = 'utf-8';
/**
 * MIME type JavaScript
 */
export const MIME_JAVASCRIPT = 'text/javascript';
/**
 * MIME type JSON
 */
export const MIME_JSON = 'application/json';
/**
 * MIME type TOML
 */
export const MIME_TOML = 'application/toml';
/**
 * MIME type YAML
 */
export const MIME_YAML = 'application/x-yaml';
/**
 * A value, that indicates, if something is NOT supported.
 */
export const NOT_SUPPORTED = Symbol('NOT_SUPPORTED');

/**
 * Content-Type value for JavaScript files.
 */
export const CONTENT_TYPE_JAVASCRIPT = `text/javascript; charset=${DEFAULT_CHARSET_HTTP}`;
/**
 * Content-Type value for JSON files.
 */
export const CONTENT_TYPE_JSON = `${MIME_JSON}; charset=${DEFAULT_CHARSET_HTTP}`;
/**
 * Content-Type value for TOML files.
 */
export const CONTENT_TYPE_TOML = `${MIME_TOML}; charset=${DEFAULT_CHARSET_HTTP}`;
/**
 * Content-Type value for YAML files.
 */
export const CONTENT_TYPE_YAML = `${MIME_YAML}; charset=${DEFAULT_CHARSET_HTTP}`;