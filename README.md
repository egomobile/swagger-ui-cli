[![npm](https://img.shields.io/npm/v/swagger-ui-cli.svg)](https://www.npmjs.com/package/swagger-ui-cli)

# swagger-ui-cli

A standalone CLI application, serving [Swagger UIs](https://swagger.io/tools/swagger-ui/) via a HTTP server.

## Install

You can install it globally:

```bash
npm install -g swagger-ui-cli
```

Or for your project, from where your `package.json` file is stored:

```bash
npm install --save-dev swagger-ui-cli
```

## Usage

```
$ swagger-ui --help

  A standalone CLI application, serving Swagger UIs via a HTTP server.

  Usage
    $ swagger-ui [options] <file>

  Options
    --allow-scripts    Allow the execution of scripts. Default: (false)
    --do-not-open      Do not open local URL after server has been started. Default: (false)
    --port, -p         The custom TCP port. Default: 8080

  <file> The source document as local file path or URL. Supports JSON, YAML and TOML.

  Examples
    Starts a new server instance on port 8080 for a local file
    $ swagger-ui swaggerFile.yaml

    Run a Node.js script (also from a remote host), which builds the document
    $ swagger-ui buildDoc.js --allow-scripts

    Using port 8181 and load document from HTTP server
    $ swagger-ui --port=8181 https://petstore.swagger.io/v2/swagger.json

    Do not open browser, after server has been started
    $ swagger-ui https://example.com/my-api.toml --do-not-open
```

### Scripts

If have a complex logic to build an [OpenAPI](https://www.openapis.org/) document, maybe it is separated into multiply sources and parts, you can execute JavaScript code, which runs in the same Node.js environment as the application.

In that case, you have to start the application with `--allow-scripts` flag.

Example:

```javascript
// use any Node.js you want
const fs = require('fs');
// you are also able to access 3rd party modules
// if a 'node_modules' folder is available
const axios = require('axios').default;
// make use of local Node modules
// which exports functions that loads
// parts of the document, e.g.
const myModule = require('/path/to/my/module.js');

const info = await fs.promises.readFile('/path/to/apiDocumentInfo.json', 'utf8');

// maybe load data from remote sources
const paths = (await axios.get('https://strapi.example.com/paths')).data;
const components = await myModule.loadComponents();

// put all parts together ...
const doc = {
  openapi: "3.0.0",

  info,

  servers: [
    {
      url: "http://petstore.swagger.io/api"
    }
  ],

  paths,
  components,
};

// ... and return the document
return doc;
```

## Download

You can download documents via browser or HTTP client directly. Examples:

* http://localhost:8080/json ([JSON](https://en.wikipedia.org/wiki/JSON))
* http://localhost:8080/toml ([TOML](https://en.wikipedia.org/wiki/TOML))
* http://localhost:8080/yaml ([YAML](https://en.wikipedia.org/wiki/YAML))

## Contributors

* [Geno Roupsky](https://github.com/groupsky)

## License

[GPL 3.0](./LICENSE)
