import angular from 'angular';

export default /* @ngInject */ function ($window, $sce, $ovhpopover) {
  const requestAnimationFrame = $window.requestAnimationFrame || $window.setTimeout;

  return {
    restrict: 'EAC',
    scope: true,
    link: function postLink(scope, element, attr) {
      // Initialize popover
      let popover = $ovhpopover(element, options);
      // Directive options
      let options = { scope };
      angular.forEach([
        'template',
        'templateUrl',
        'controller',
        'controllerAs',
        'contentTemplate',
        'placement',
        'container',
        'delay',
        'trigger',
        'html',
        'animation',
        'customClass',
        'autoClose',
        'id',
        'prefixClass',
        'prefixEvent',
      ], (key) => {
        if (angular.isDefined(attr[key])) {
          options[key] = attr[key];
        }
      });

      // use string regex match boolean attr falsy values, leave truthy values be
      const falseValueRegExp = /^(false|0|)$/i;
      angular.forEach(['html', 'container', 'autoClose'], (key) => {
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

      // Support scope as data-attrs
      angular.forEach(['title', 'content'], (key) => {
        if (attr[key]) {
          attr.$observe(key, (newValue, oldValue) => {
            scope[key] = $sce.trustAsHtml(newValue);
            if (angular.isDefined(oldValue)) {
              requestAnimationFrame(() => {
                if (popover) {
                  popover.$applyPlacement();
                }
              });
            }
          });
        }
      });

      // Support scope as an object
      if (attr.bsPopover) {
        scope.$watch(attr.bsPopover, (newValue, oldValue) => {
          if (angular.isObject(newValue)) {
            angular.extend(scope, newValue);
          } else {
            scope.content = newValue;
          }
          if (angular.isDefined(oldValue)) {
            requestAnimationFrame(() => {
              if (popover) {
                popover.$applyPlacement();
              }
            });
          }
        }, true);
      }

      // Visibility binding support
      if (attr.bsShow) {
        scope.$watch(attr.bsShow, (newValue) => {
          if (!popover || !angular.isDefined(newValue)) {
            return;
          }
          if (angular.isString(newValue)) {
            newValue = !!newValue.match(/true|,?(popover),?/i); // eslint-disable-line no-param-reassign
          }
          if (newValue === true) {
            popover.show();
          } else {
            popover.hide();
          }
        });
      }

      // Viewport support
      if (attr.viewport) {
        scope.$watch(attr.viewport, (newValue) => {
          if (!popover || !angular.isDefined(newValue)) {
            return;
          }
          popover.setViewport(newValue);
        });
      }

      // Garbage collection
      scope.$on('$destroy', () => {
        if (popover) {
          popover.destroy();
        }
        options = null;
        popover = null;
      });
    },
  };
}
