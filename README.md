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

  Examples
    $ swagger-ui /path/to/local/swaggerFile.yaml
    $ swagger-ui --port=8181 https://petstore.swagger.io/v2/swagger.json
    $ swagger-ui https://example.com/my-api.toml --do-not-open
```

### Examples

#### Local file

```bash
# http://localhost:8080
swagger-ui /path/to/my/local/file

# with custom port 8181
# swagger-ui --port=8181 /path/to/my/local/file
```

#### From remote HTTP server

```bash
swagger-ui https://petstore.swagger.io/v2/swagger.json
```

## License

[GPL 3.0](./LICENSE)
