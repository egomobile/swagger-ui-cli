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

import meow from 'meow';
import { ExitCode } from './contracts';

const cli = meow(`
Usage
  $ swagger-ui [options] <file>

Options
  --do-not-open   Do not open local URL after server has been started. Default: (false)
  --port, -p      The custom TCP port. Default: 8080

<file> The source document as local file path or URL. Supports JSON, YAML and TOML.

Examples
  Starts a new server instance on port 8080 for a local file
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

/**
 * Exists with a code and a warning message.
 *
 * @param {ExitCode} code The code.
 * @param {any} msg The message.
 */
export function exitWith(code: ExitCode, msg: any) {
    console.warn('🛑', msg);

    console.log('');
    cli.showHelp(code);
}

export default cli;
