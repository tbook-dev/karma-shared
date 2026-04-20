# @tbook/shared

Chain constants, prize-config schema, sui-provider, and formatting utilities
shared between `karma-web` (consumer app) and `karma-admin` (operator app).

## Publish

Push a git tag `v*.*.*` — GitHub Actions publishes to GitHub Packages
automatically.

## Install in consumer repos

```
# .npmrc
@tbook:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```
yarn add @tbook/shared@1.x
```
