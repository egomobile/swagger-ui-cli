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
```

## Download

You can download documents via browser or HTTP client directly. Examples:

* http://localhost:8080/json ([JSON](https://en.wikipedia.org/wiki/JSON))
* http://localhost:8080/toml ([TOML](https://en.wikipedia.org/wiki/TOML))
* http://localhost:8080/yaml ([YAML](https://en.wikipedia.org/wiki/YAML))

## License

[GPL 3.0](./LICENSE)
