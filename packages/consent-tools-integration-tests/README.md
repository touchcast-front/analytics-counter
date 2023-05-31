Why is this using wd.io instead of playwright?
- Webdriver.io is committed to the Webdriver Protocol, which is a community-driven spec (as opposed to Chrome Webdriver Protocol.). Playwright uses the Chrome Webdriver protocol for chrome and it's own [custom protocol](https://github.com/microsoft/playwright/issues/4862) for safari / edge.
- Webdriver.io protocol allows for much better device support-- such as ie11.
- Webdriver.io has native support for lighthouse and lots of other cool stuff!



Browser targets:

- latest verison of chrome
- latest version of safari
- latest version of firefox
- iOS 13 (older version of safari)

## Running tests

1. Build dependencies and start local server

```sh
yarn browser-destinations:build &&
yarn start-destination-server
```

2. Run tests locally

```sh
yarn run test:local
```

3. Run tests on Sauce Labs

```sh
SAUCE_USERNAME=??? SAUCE_ACCESS_KEY=??? yarn run test:sauce
```


## Project structure
- `src` - Test files and fixtures
- `public` - Where asssets related to tests are kept
- `public/dist` - Where build artifacts are kept that get loaded into the test page.