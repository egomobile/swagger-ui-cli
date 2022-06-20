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

import meow from "meow";
import { ExitCode } from "./contracts";

const cli = meow(`
Usage
  $ swagger-ui [options] <file>

Options
  --allow-scripts    Allow the execution of scripts. Default: (false)
  --do-not-open      Do not open local URL after server has been started. Default: (false)
  --no-json          Do not provide JSON data as download. Default: (false)
  --no-toml          Do not provide TOML data as download. Default: (false)
  --no-yaml          Do not provide YAML data as download. Default: (false)
  --port, -p         The custom TCP port. Default: 8080

<file> The source document as local file path or URL. Supports JSON, YAML and TOML.

Examples
  Starts a new server instance on port 8080 for a local file
  $ swagger-ui swaggerFile.yaml

  Run a Node.js script (also from a remote host), which builds the document
  $ swagger-ui buildDoc.js --allow-scripts

  Using port 8181 and load document from HTTP server without providing TOML as download
  $ swagger-ui https://raw.githubusercontent.com/apache/superset/1.4.0rc2/docs/src/resources/openapi.json --no-toml --port=8181

  Do not open browser, after server has been started
  $ swagger-ui https://example.com/my-api.toml --do-not-open
`, {
    "flags": {
        "allow-scripts": {
            "type": "boolean",
            "default": false,
            "isRequired": false
        },
        "do-not-open": {
            "type": "boolean",
            "default": false,
            "isRequired": false
        },
        "json": {
            "type": "boolean",
            "default": true,
            "isRequired": false
        },
        "port": {
            "type": "number",
            "alias": "p",
            "default": 8080,
            "isRequired": false
        },
        "toml": {
            "type": "boolean",
            "default": true,
            "isRequired": false
        },
        "yaml": {
            "type": "boolean",
            "default": true,
            "isRequired": false
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
    console.warn("🛑", msg);

    console.log("");
    cli.showHelp(code);
}

export default cli;