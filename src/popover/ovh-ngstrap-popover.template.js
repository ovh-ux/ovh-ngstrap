angular.module("ovh-ngStrap-popover").run(["$templateCache", function ($templateCache) {

    "use strict";

    $templateCache.put("popover/popover.tpl.html", '<div class="popover"><div class="arrow"></div><h3 class="popover-title" ng-bind="title" ng-show="title"></h3><div class="popover-content" ng-bind="content"></div></div>');

}]);
