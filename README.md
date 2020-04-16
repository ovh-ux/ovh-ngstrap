# ovh-ngstrap

> AngularJS directives for Bootstrap

[![Downloads](https://badgen.net/npm/dt/@ovh-ux/ovh-ngstrap)](https://npmjs.com/package/@ovh-ux/ovh-ngstrap)[![Dependencies](https://badgen.net/david/dep/ovh-ux/ovh-ngstrap)](https://npmjs.com/package/@ovh-ux/ovh-ngstrap?activeTab=dependencies)[![Dev Dependencies](https://badgen.net/david/dev/ovh-ux/ovh-ngstrap)](https://npmjs.com/package/@ovh-ux/ovh-ngstrap?activeTab=dependencies)[![Gitter](https://badgen.net/badge/gitter/ovh-ux/blue?icon=gitter)](https://gitter.im/ovh/ux)

This is a "fork" of [ngStrap](http://mgcrea.github.io/angular-strap/). It has been created to avoid compatibility issues with [angular-ui](https://github.com/angular-ui/bootstrap) and will be deleted when ngStrap will be merged with it's own fix.

__IMPORTANT NOTE__ : version 3.x.x of ovh-ngstrap is now a fork of [ngStrap](http://mgcrea.github.io/angular-strap/) version 2.3.2 which broke the calculation of the positioning and add some options. Be careful when updating your bower project with this version. See in the html infrastructure file of /cloud for an example.

__Note__ : There is only popover and it's dependency (tooltip) that there have been included in `ovh-ngstrap`.


## Install

```sh
yarn add @ovh-ux/ovh-ngstrap
```

## Usage

```js
import angular from 'angular';
import ovhNgStrap from '@ovh-ux/ovh-ngstrap';

angular
  .module('myApp', [
    ovhNgStrap,
  ]);
```

For displaying the content of an html file in a beautiful popover, simply add the `data-ovh-popover` and the `data-content-template` attributes to your dom element.

```html
<button type="button" data-ovh-popover data-content-template="content.html">Click me if you want to see content of content.html in a beautifull popover</button>
```

## Test

```sh
yarn test
```

## Contributing

Always feel free to help out! Whether it's [filing bugs and feature requests](https://github.com/ovh-ux/ovh-ngstrap/issues/new) or working on some of the [open issues](https://github.com/ovh-ux/ovh-ngstrap/issues), our [contributing guide](CONTRIBUTING.md) will help get you started.

## License

[BSD-3-Clause](LICENSE) © OVH SAS
