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

import crypto from 'crypto';
import fs from 'fs';
import ora from 'ora';
import path from 'path';
import { promisify } from 'util';
import { Nilable } from '@egodigital/types';
import { ExitCode } from './contracts';

/**
 * Promise version of 'fs.exists()'.
 */
export const exists = promisify(fs.exists);
/**
 * Promise version of 'fs.readFile()'.
 */
export const readFile = promisify(fs.readFile);
/**
 * Promise version of 'fs.stat()'.
 */
export const stat = promisify(fs.stat);

/**
 * Hashes data with SHA-256.
 *
 * @param {Buffer} data The data to hash.
 *
 * @returns {string} The SHA-256 hash.
 */
export function hashData(data: Buffer): string {
    return crypto.createHash('sha256')
        .update(data)
        .digest('hex');
}

/**
 * Normalizes a path.
 *
 * @param {string} p The path.
 *
 * @returns {string} The normalized value.
 */
export function normalizePath(p: Nilable<string>): string {
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

/**
 * Executes an async action, using a spinner.
 *
 * @param {string} text The initial text.
 * @param {Function} action The action to invoke.
 * @param {string} [symbol] The custom success symbol to use.
 *
 * @returns {Promise<TResult>} The promise with the result of the action.
 */
export async function withSpinner<TResult extends any = any>(
    text: string,
    action: (spinner: ora.Ora) => Promise<TResult>,
    symbol = '✅'
): Promise<TResult> {
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