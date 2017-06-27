angular.module("ovh-ngStrap-tooltip").run(["$templateCache", function ($templateCache) {

    "use strict";

    $templateCache.put("tooltip/tooltip.tpl.html", '<div class="tooltip in" ng-show="title"><div class="tooltip-arrow"></div><div class="tooltip-inner" ng-bind="title"></div></div>');

}]);
