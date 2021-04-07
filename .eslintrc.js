module.exports = {
    "root": true,
    "extends": "ego",
    "parserOptions": {
        "project": "tsconfig.json",
        "tsconfigRootDir": __dirname,
        "sourceType": "module",
    },
    "rules": {
        "import/no-default-export": ["off"]
    }
}