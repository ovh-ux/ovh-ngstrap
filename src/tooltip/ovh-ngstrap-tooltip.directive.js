angular.module("ovh-ngStrap-tooltip").directive("ovhTooltip", function ($window, $location, $sce, $ovhtooltip, $$rAF) {
    "use strict";

    return {
        restrict: "EAC",
        scope: true,
        link: function postLink (scope, element, attr) {

            // Directive options
            var options = { scope: scope };
            angular.forEach(["template", "templateUrl", "controller", "controllerAs", "contentTemplate", "placement", "container", "delay", "trigger", "html", "animation", "backdropAnimation", "type", "customClass", "id"], function (key) {
                if (angular.isDefined(attr[key])) {
                    options[key] = attr[key];
                }
            });

            // use string regex match boolean attr falsy values, leave truthy values be
            var falseValueRegExp = /^(false|0|)$/i;
            angular.forEach(["html", "container"], function (key) {
                if (angular.isDefined(attr[key]) && falseValueRegExp.test(attr[key])) {
                    options[key] = false;
                }
            });

            // should not parse target attribute (anchor tag), only data-target #1454
            var dataTarget = element.attr("data-target");
            if (angular.isDefined(dataTarget)) {
                if (falseValueRegExp.test(dataTarget)) {
                    options.target = false;
                } else {
                    options.target = dataTarget;
                }
            }

            // overwrite inherited title value when no value specified
            // fix for angular 1.3.1 531a8de72c439d8ddd064874bf364c00cedabb11
            if (!scope.hasOwnProperty("title")) { // eslint-disable-line no-prototype-builtins
                scope.title = "";
            }

            // Observe scope attributes for change
            attr.$observe("title", function (newValue) {
                if (angular.isDefined(newValue) || !scope.hasOwnProperty("title")) { // eslint-disable-line no-prototype-builtins
                    var oldValue = scope.title;
                    scope.title = $sce.trustAsHtml(newValue);
                    if (angular.isDefined(oldValue)) {
                        $$rAF(function () {
                            if (tooltip) {
                                tooltip.$applyPlacement();
                            }
                        });
                    }
                }
            });

            // Support scope as an object
            if (attr.bsTooltip) {
                scope.$watch(attr.bsTooltip, function (newValue, oldValue) {
                    if (angular.isObject(newValue)) {
                        angular.extend(scope, newValue);
                    } else {
                        scope.title = newValue;
                    }
                    if (angular.isDefined(oldValue)) {
                        $$rAF(function () {
                            if (tooltip) {
                                tooltip.$applyPlacement();
                            }
                        });
                    }
                }, true);
            }

            // Visibility binding support
            if (attr.bsShow) {
                scope.$watch(attr.bsShow, function (newValue) {
                    if (!tooltip || !angular.isDefined(newValue)) {
                        return;
                    }
                    if (angular.isString(newValue)) {
                        newValue = !!newValue.match(/true|,?(tooltip),?/i); // eslint-disable-line no-param-reassign
                    }
                    if (newValue === true) {
                        tooltip.show();
                    } else {
                        tooltip.hide();
                    }
                });
            }

            // Enabled binding support
            if (attr.bsEnabled) {
                scope.$watch(attr.bsEnabled, function (newValue) {
                    // console.warn('scope.$watch(%s)', attr.bsEnabled, newValue, oldValue);
                    if (!tooltip || !angular.isDefined(newValue)) {
                        return;
                    }
                    if (angular.isString(newValue)) {
                        newValue = !!newValue.match(/true|1|,?(tooltip),?/i); // eslint-disable-line no-param-reassign
                    }
                    if (newValue === false) {
                        tooltip.setEnabled(false);
                    } else {
                        tooltip.setEnabled(true);
                    }
                });
            }

            // Viewport support
            if (attr.viewport) {
                scope.$watch(attr.viewport, function (newValue) {
                    if (!tooltip || !angular.isDefined(newValue)) {
                        return;
                    }
                    tooltip.setViewport(newValue);
                });
            }

            // Initialize popover
            var tooltip = $ovhtooltip(element, options);

            // Garbage collection
            scope.$on("$destroy", function () {
                if (tooltip) {
                    tooltip.destroy();
                }
                options = null;
                tooltip = null;
            });

        }
    };

});
