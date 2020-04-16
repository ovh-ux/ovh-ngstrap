import angular from 'angular';

export default /* @ngInject */ function ($window, $location, $sce, $ovhtooltip, $$rAF) {
  return {
    restrict: 'EAC',
    scope: true,
    link: function postLink(scope, element, attr) {
      // Initialize popover
      let tooltip = $ovhtooltip(element, options);
      // Directive options
      let options = { scope };
      angular.forEach(['template', 'templateUrl', 'controller', 'controllerAs', 'contentTemplate', 'placement', 'container', 'delay', 'trigger', 'html', 'animation', 'backdropAnimation', 'type', 'customClass', 'id'], (key) => {
        if (angular.isDefined(attr[key])) {
          options[key] = attr[key];
        }
      });

      // use string regex match boolean attr falsy values, leave truthy values be
      const falseValueRegExp = /^(false|0|)$/i;
      angular.forEach(['html', 'container'], (key) => {
        if (angular.isDefined(attr[key]) && falseValueRegExp.test(attr[key])) {
          options[key] = false;
        }
      });

      // should not parse target attribute (anchor tag), only data-target #1454
      const dataTarget = element.attr('data-target');
      if (angular.isDefined(dataTarget)) {
        if (falseValueRegExp.test(dataTarget)) {
          options.target = false;
        } else {
          options.target = dataTarget;
        }
      }

      // overwrite inherited title value when no value specified
      // fix for angular 1.3.1 531a8de72c439d8ddd064874bf364c00cedabb11
      if (!scope.hasOwnProperty('title')) { // eslint-disable-line no-prototype-builtins
        scope.title = '';
      }

      // Observe scope attributes for change
      attr.$observe('title', (newValue) => {
        if (angular.isDefined(newValue) || !scope.hasOwnProperty('title')) { // eslint-disable-line no-prototype-builtins
          const oldValue = scope.title;
          scope.title = $sce.trustAsHtml(newValue);
          if (angular.isDefined(oldValue)) {
            $$rAF(() => {
              if (tooltip) {
                tooltip.$applyPlacement();
              }
            });
          }
        }
      });

      // Support scope as an object
      if (attr.bsTooltip) {
        scope.$watch(attr.bsTooltip, (newValue, oldValue) => {
          if (angular.isObject(newValue)) {
            angular.extend(scope, newValue);
          } else {
            scope.title = newValue;
          }
          if (angular.isDefined(oldValue)) {
            $$rAF(() => {
              if (tooltip) {
                tooltip.$applyPlacement();
              }
            });
          }
        }, true);
      }

      // Visibility binding support
      if (attr.bsShow) {
        scope.$watch(attr.bsShow, (newValue) => {
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
        scope.$watch(attr.bsEnabled, (newValue) => {
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
        scope.$watch(attr.viewport, (newValue) => {
          if (!tooltip || !angular.isDefined(newValue)) {
            return;
          }
          tooltip.setViewport(newValue);
        });
      }

      // Garbage collection
      scope.$on('$destroy', () => {
        if (tooltip) {
          tooltip.destroy();
        }
        options = null;
        tooltip = null;
      });
    },
  };
}
