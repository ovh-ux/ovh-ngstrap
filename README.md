# AngularStrap - AngularJS directives for Bootstrap

![githubbanner](https://user-images.githubusercontent.com/3379410/27423240-3f944bc4-5731-11e7-87bb-3ff603aff8a7.png)

[![Maintenance](https://img.shields.io/maintenance/yes/2017.svg)]() [![Chat on gitter](https://img.shields.io/gitter/room/ovh/ux.svg)](https://gitter.im/ovh/ux) [![Build Status](https://travis-ci.org/ovh-ux/ovh-ngstrap.svg)](https://travis-ci.org/ovh-ux/ovh-ngstrap)

[![NPM](https://nodei.co/npm/ovh-ngstrap.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/ovh-ngstrap/)



This is a "fork" of [ngStrap](http://mgcrea.github.io/angular-strap/). It has been created to avoid compatibility issues with [angular-ui](https://github.com/angular-ui/bootstrap) and will be deleted when ngStrap will be merged with it's own fix.

__IMPORTANT NOTE__ : version 3.x.x of ovh-ngStrap is now a fork of [ngStrap](http://mgcrea.github.io/angular-strap/) version 2.3.2 which broke the calculation of the positioning and add some options. Be careful when updating your bower project with this version. See in the html infrastructure file of /cloud for an example.

__Note__ : There is only popover and it's dependency (tooltip) that there have been included in `ovh-ngStrap`.

  
For displaying the content of an html file in a beautiful popover, simply add the `data-ovh-popover` and the `data-content-template` attributes to your dom element.

```html
<button type="button" data-ovh-popover data-content-template="content.html">Click me if you want to see content of content.html in a beautifull popover</button>
```

See options of [mgcrea.ngStrap.popover](http://mgcrea.github.io/angular-strap/#/popovers#popovers) for all possible options.
 
# Installation

    bower install ovh-ngstrap --save
 
# Configuration

1. Include `ovh-ngstrap.js` in your app:

  `<script src="bower_components/ovh-ngStrap/dist/ovh-ngstrap.js"></script>`

2. Add `ovh-ngStrap` as a new module dependency in your angular app.

  `var myapp = angular.module('myapp', ['ovh-ngStrap']);`
 
## Get the sources
 
```bash
    git clone https://github.com/ovh-ux/ovh-ngstrap.git
    cd ovh-ngstrap
    npm install
    bower install
```
 
You've developed a new cool feature ? Fixed an annoying bug ? We'd be happy
to hear from you !

Have a look in [CONTRIBUTING.md](https://github.com/ovh-ux/ovh-ngstrap/blob/master/CONTRIBUTING.md)
 
## Run the tests
 
```
npm test
```
 
# Related links
 
 * Contribute: https://github.com/ovh-ux/ovh-ngstrap/blob/master/CONTRIBUTING.md
 * Report bugs: https://github.com/ovh-ux/ovh-ngstrap/issues
 * Get latest version: https://github.com/ovh-ux/ovh-ngstrap
 
# License
 
See https://github.com/ovh/ovh-ngstrap/blob/master/LICENSE
