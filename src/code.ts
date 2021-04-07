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

/**
 * Executes JavaScript code.
 *
 * @param {string} _fe088c3600c74339bb737faa64fd049a_code The code to execute.
 *
 * @returns {Promise<any>} The promise with the result of the execution.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function executeCode(_fe088c3600c74339bb737faa64fd049a_code: string): Promise<any> {
    return eval(`(async () => {

${_fe088c3600c74339bb737faa64fd049a_code}

})();`);
}