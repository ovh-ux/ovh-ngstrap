import angular from 'angular';

export default /* @ngInject */ function () {
  const defaults = this.defaults = {
    animation: 'am-fade',
    customClass: '',
    prefixClass: 'tooltip',
    prefixEvent: 'tooltip',
    container: false,
    target: false,
    placement: 'top',
    templateUrl: 'tooltip/tooltip.tpl.html',
    template: '',
    contentTemplate: false,
    trigger: 'hover focus',
    keyboard: false,
    html: false,
    show: false,
    title: '',
    type: '',
    delay: 0,
    autoClose: false,
    bsEnabled: true,
    viewport: {
      selector: 'body',
      padding: 0,
    },
  };

  this.$get = function ($window, $rootScope, OVHCompiler, $q, $templateCache, $http, $animate, $sce, OVHDimensions, $$rAF, $timeout) {
    // var trim = String.prototype.trim;
    const isTouch = 'createTouch' in $window.document;

    // var htmlReplaceRegExp = /ng-bind="/ig;
    const $body = angular.element($window.document);

    // Helper functions

    function safeDigest(scope) {
      if (!scope.$$phase && !(scope.$root && scope.$root.$$phase)) {
        scope.$digest();
      }
    }

    function findElement(query, element) {
      return angular.element((element || document).querySelectorAll(query));
    }

    function TooltipFactory(element, config) {
      const $tooltip = {};

      // Common vars
      const options = $tooltip.$options = angular.extend({}, defaults, config);
      const promise = $tooltip.$promise = OVHCompiler.compile(options);
      const scope = $tooltip.$scope = (options.scope && options.scope.$new()) || $rootScope.$new();

      const nodeName = element[0].nodeName.toLowerCase();
      if (options.delay && angular.isString(options.delay)) {
        const split = options.delay.split(',').map(parseFloat);
        options.delay = split.length > 1 ? { show: split[0], hide: split[1] } : split[0];
      }

      // Store $id to identify the triggering element in events
      // give priority to options.id, otherwise, try to use
      // element id if defined
      $tooltip.$id = options.id || element.attr('id') || '';

      // Support scope as string options
      if (options.title) {
        scope.title = $sce.trustAsHtml(options.title);
      }

      // Provide scope helpers
      scope.$setEnabled = function (isEnabled) {
        scope.$$postDigest(() => {
          $tooltip.setEnabled(isEnabled);
        });
      };
      scope.$hide = function () {
        scope.$$postDigest(() => {
          $tooltip.hide();
        });
      };
      scope.$show = function () {
        scope.$$postDigest(() => {
          $tooltip.show();
        });
      };
      scope.$toggle = function () {
        scope.$$postDigest(() => {
          $tooltip.toggle();
        });
      };

      // Publish isShown as a protected var on scope
      $tooltip.$isShown = scope.$isShown = false;

      // Private vars
      let timeout;
      let hoverState;

      // Fetch, compile then initialize tooltip
      let compileData;
      let tipElement;
      let tipContainer;
      let tipScope;
      promise.then((data) => {
        compileData = data;
        $tooltip.init();
      });

      $tooltip.init = function () {
        // Options: delay
        if (options.delay && angular.isNumber(options.delay)) {
          options.delay = {
            show: options.delay,
            hide: options.delay,
          };
        }

        // Replace trigger on touch devices ?
        // if(isTouch && options.trigger === defaults.trigger) {
        //   options.trigger.replace(/hover/g, 'click');
        // }

        // Options : container
        if (options.container === 'self') {
          tipContainer = element;
        } else if (angular.isElement(options.container)) {
          tipContainer = options.container;
        } else if (options.container) {
          tipContainer = findElement(options.container);
        }

        // Options: trigger
        bindTriggerEvents();

        // Options: target
        if (options.target) {
          options.target = angular.isElement(options.target) ? options.target : findElement(options.target);
        }

        // Options: show
        if (options.show) {
          scope.$$postDigest(() => {
            if (options.trigger === 'focus') {
              element[0].focus();
            } else {
              $tooltip.show();
            }
          });
        }
      };

      $tooltip.destroy = function () {
        // Unbind events
        unbindTriggerEvents();

        // Remove element
        destroyTipElement();

        // Destroy scope
        scope.$destroy();
      };

      $tooltip.enter = function () {
        clearTimeout(timeout);
        hoverState = 'in';
        if (!options.delay || !options.delay.show) {
          return $tooltip.show();
        }

        timeout = setTimeout(() => {
          if (hoverState === 'in') {
            $tooltip.show();
          }
        }, options.delay.show);
      };

      $tooltip.show = function () {
        if (!options.bsEnabled || $tooltip.$isShown) {
          return;
        }

        scope.$emit(`${options.prefixEvent}.show.before`, $tooltip);
        let parent;
        let after;
        if (options.container) {
          parent = tipContainer;
          if (tipContainer[0].lastChild) {
            after = angular.element(tipContainer[0].lastChild);
          } else {
            after = null;
          }
        } else {
          parent = null;
          after = element;
        }


        // Hide any existing tipElement
        if (tipElement) {
          destroyTipElement();
        }

        // Fetch a cloned element linked from template
        tipScope = $tooltip.$scope.$new();
        tipElement = $tooltip.$element = compileData.link(tipScope, () => { }); // eslint-disable-line no-empty-function

        // Set the initial positioning.  Make the tooltip invisible
        // so IE doesn't try to focus on it off screen.
        tipElement.css({
          top: '-9999px', left: '-9999px', right: 'auto', display: 'block', visibility: 'hidden',
        });

        // Options: animation
        if (options.animation) {
          tipElement.addClass(options.animation);
        }

        // Options: type
        if (options.type) {
          tipElement.addClass(`${options.prefixClass}-${options.type}`);
        }

        // Options: custom classes
        if (options.customClass) {
          tipElement.addClass(options.customClass);
        }

        // Append the element, without any animations.  If we append
        // using $animate.enter, some of the animations cause the placement
        // to be off due to the transforms.
        if (after) {
          after.after(tipElement);
        } else {
          parent.prepend(tipElement);
        }

        $tooltip.$isShown = scope.$isShown = true;
        safeDigest(scope);

        // Now, apply placement
        $tooltip.$applyPlacement();

        // Once placed, animate it.
        // Support v1.2+ $animate
        // https://github.com/angular/angular.js/issues/11713
        if (angular.version.minor <= 2) {
          $animate.enter(tipElement, parent, after, enterAnimateCallback);
        } else {
          $animate.enter(tipElement, parent, after).then(enterAnimateCallback);
        }
        safeDigest(scope);

        $$rAF(() => {
          // Once the tooltip is placed and the animation starts, make the tooltip visible
          if (tipElement) {
            tipElement.css({ visibility: 'visible' });
          }
        });

        // Bind events
        if (options.keyboard) {
          if (options.trigger !== 'focus') {
            $tooltip.focus();
          }
          bindKeyboardEvents();
        }

        if (options.autoClose) {
          bindAutoCloseEvents();
        }
      };

      function enterAnimateCallback() {
        scope.$emit(`${options.prefixEvent}.show`, $tooltip);
      }

      $tooltip.leave = function () {
        clearTimeout(timeout);
        hoverState = 'out';
        if (!options.delay || !options.delay.hide) {
          return $tooltip.hide();
        }
        timeout = setTimeout(() => {
          if (hoverState === 'out') {
            $tooltip.hide();
          }
        }, options.delay.hide);
      };

      let _blur; // eslint-disable-line no-underscore-dangle
      let _tipToHide; // eslint-disable-line no-underscore-dangle
      $tooltip.hide = function (blur) {
        if (!$tooltip.$isShown) {
          return;
        }
        scope.$emit(`${options.prefixEvent}.hide.before`, $tooltip);

        // store blur value for leaveAnimateCallback to use
        _blur = blur;

        // store current tipElement reference to use
        // in leaveAnimateCallback
        _tipToHide = tipElement;

        // Support v1.2+ $animate
        // https://github.com/angular/angular.js/issues/11713
        if (angular.version.minor <= 2) {
          $animate.leave(tipElement, leaveAnimateCallback);
        } else {
          $animate.leave(tipElement).then(leaveAnimateCallback);
        }

        $tooltip.$isShown = scope.$isShown = false;
        safeDigest(scope);

        // Unbind events
        if (options.keyboard && tipElement !== null) {
          unbindKeyboardEvents();
        }

        if (options.autoClose && tipElement !== null) {
          unbindAutoCloseEvents();
        }
      };

      function leaveAnimateCallback() {
        scope.$emit(`${options.prefixEvent}.hide`, $tooltip);

        // check if current tipElement still references
        // the same element when hide was called
        if (tipElement === _tipToHide) {
          // Allow to blur the input when hidden, like when pressing enter key
          if (_blur && options.trigger === 'focus') {
            return element[0].blur();
          }

          // clean up child scopes
          destroyTipElement();
        }
      }

      $tooltip.toggle = function () {
        if ($tooltip.$isShown) {
          $tooltip.leave();
        } else {
          $tooltip.enter();
        }
      };

      $tooltip.focus = function () {
        tipElement[0].focus();
      };

      $tooltip.setEnabled = function (isEnabled) {
        options.bsEnabled = isEnabled;
      };

      $tooltip.setViewport = function (viewport) {
        options.viewport = viewport;
      };

      // Protected methods

      $tooltip.$applyPlacement = function () {
        if (!tipElement) {
          return;
        }

        // Determine if we're doing an auto or normal placement
        let { placement } = options;
        const autoToken = /\s?auto?\s?/i;
        const autoPlace = autoToken.test(placement);

        if (autoPlace) {
          placement = placement.replace(autoToken, '') || defaults.placement;
        }

        // Need to add the position class before we get
        // the offsets
        tipElement.addClass(options.placement);

        // Get the position of the target element
        // and the height and width of the tooltip so we can center it.
        const elementPosition = getPosition();
        const tipWidth = tipElement.prop('offsetWidth');
        const tipHeight = tipElement.prop('offsetHeight');

        // Refresh viewport position
        $tooltip.$viewport = options.viewport && findElement(options.viewport.selector || options.viewport);

        // If we're auto placing, we need to check the positioning
        if (autoPlace) {
          const originalPlacement = placement;
          const viewportPosition = getPosition($tooltip.$viewport);

          // Determine if the vertical placement
          if (originalPlacement.indexOf('bottom') >= 0 && elementPosition.bottom + tipHeight > viewportPosition.bottom) {
            placement = originalPlacement.replace('bottom', 'top');
          } else if (originalPlacement.indexOf('top') >= 0 && elementPosition.top - tipHeight < viewportPosition.top) {
            placement = originalPlacement.replace('top', 'bottom');
          }

          // Determine the horizontal placement
          // The exotic placements of left and right are opposite of the standard placements.  Their arrows are put on the left/right
          // and flow in the opposite direction of their placement.
          if ((originalPlacement === 'right' || originalPlacement === 'bottom-left' || originalPlacement === 'top-left')
            && elementPosition.right + tipWidth > viewportPosition.width) {
            placement = originalPlacement === 'right' ? 'left' : placement.replace('left', 'right');
          } else if ((originalPlacement === 'left' || originalPlacement === 'bottom-right' || originalPlacement === 'top-right')
            && elementPosition.left - tipWidth < viewportPosition.left) {
            placement = originalPlacement === 'left' ? 'right' : placement.replace('right', 'left');
          }

          tipElement.removeClass(originalPlacement).addClass(placement);
        }

        // Get the tooltip's top and left coordinates to center it with this directive.
        const tipPosition = getCalculatedOffset(placement, elementPosition, tipWidth, tipHeight);
        applyPlacement(tipPosition, placement);
      };

      $tooltip.$onKeyUp = function (evt) {
        if (evt.which === 27 && $tooltip.$isShown) {
          $tooltip.hide();
          evt.stopPropagation();
        }
      };

      $tooltip.$onFocusKeyUp = function (evt) {
        if (evt.which === 27) {
          element[0].blur();
          evt.stopPropagation();
        }
      };

      $tooltip.$onFocusElementMouseDown = function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        // Some browsers do not auto-focus buttons (eg. Safari)
        if ($tooltip.$isShown) {
          element[0].blur();
        } else {
          element[0].focus();
        }
      };

      // bind/unbind events
      function bindTriggerEvents() {
        const triggers = options.trigger.split(' ');
        angular.forEach(triggers, (trigger) => {
          if (trigger === 'click') {
            element.on('click', $tooltip.toggle);
          } else if (trigger !== 'manual') {
            element.on(trigger === 'hover' ? 'mouseenter' : 'focus', $tooltip.enter);
            element.on(trigger === 'hover' ? 'mouseleave' : 'blur', $tooltip.leave);
            if (nodeName === 'button' && trigger !== 'hover') {
              if (isTouch) {
                element.on('touchstart', $tooltip.$onFocusElementMouseDown);
              } else {
                element.on('mousedown', $tooltip.$onFocusElementMouseDown);
              }
            }
          }
        });
      }

      function unbindTriggerEvents() {
        const triggers = options.trigger.split(' ');
        for (let i = triggers.length; i--;) {
          const trigger = triggers[i];
          if (trigger === 'click') {
            element.off('click', $tooltip.toggle);
          } else if (trigger !== 'manual') {
            element.off(trigger === 'hover' ? 'mouseenter' : 'focus', $tooltip.enter);
            element.off(trigger === 'hover' ? 'mouseleave' : 'blur', $tooltip.leave);
            if (nodeName === 'button' && trigger !== 'hover') {
              if (isTouch) {
                element.on('touchstart', $tooltip.$onFocusElementMouseDown);
              } else {
                element.on('mousedown', $tooltip.$onFocusElementMouseDown);
              }
            }
          }
        }
      }

      function bindKeyboardEvents() {
        if (options.trigger !== 'focus') {
          tipElement.on('keyup', $tooltip.$onKeyUp);
        } else {
          element.on('keyup', $tooltip.$onFocusKeyUp);
        }
      }

      function unbindKeyboardEvents() {
        if (options.trigger !== 'focus') {
          tipElement.off('keyup', $tooltip.$onKeyUp);
        } else {
          element.off('keyup', $tooltip.$onFocusKeyUp);
        }
      }

      let _autoCloseEventsBinded = false; // eslint-disable-line no-underscore-dangle
      function bindAutoCloseEvents() {
        // use timeout to hookup the events to prevent
        // event bubbling from being processed imediately.
        $timeout(() => {
          // Stop propagation when clicking inside tooltip
          tipElement.on('click', stopEventPropagation);

          // Hide when clicking outside tooltip
          $body.on('click', $tooltip.hide);

          _autoCloseEventsBinded = true;
        }, 0, false);
      }

      function unbindAutoCloseEvents() {
        if (_autoCloseEventsBinded) {
          tipElement.off('click', stopEventPropagation);
          $body.off('click', $tooltip.hide);
          _autoCloseEventsBinded = false;
        }
      }

      function stopEventPropagation(event) {
        event.stopPropagation();
      }

      // Private methods

      function getPosition($element) {
        $element = $element || (options.target || element); // eslint-disable-line no-param-reassign

        const el = $element[0];
        const isBody = el.tagName === 'BODY';

        const elRect = el.getBoundingClientRect();
        let rect = {};

        // IE8 has issues with angular.extend and using elRect directly.
        // By coping the values of elRect into a new object, we can continue to use extend
        for (const p in elRect) { // eslint-disable-line guard-for-in
          // DO NOT use hasOwnProperty when inspecting the return of getBoundingClientRect.
          rect[p] = elRect[p];
        }

        if (rect.width === null) {
          // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
          rect = angular.extend({}, rect, { width: elRect.right - elRect.left, height: elRect.bottom - elRect.top });
        }
        const elOffset = isBody ? { top: 0, left: 0 } : OVHDimensions.offset(el);
        const scroll = { scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.prop('scrollTop') || 0 };
        const outerDims = isBody ? { width: document.documentElement.clientWidth, height: $window.innerHeight } : null;

        return angular.extend({}, rect, scroll, outerDims, elOffset);
      }

      function getCalculatedOffset(placement, position, actualWidth, actualHeight) {
        let offset;
        const split = placement.split('-');

        switch (split[0]) {
          case 'right':
            offset = {
              top: position.top + position.height / 2 - actualHeight / 2,
              left: position.left + position.width,
            };
            break;
          case 'bottom':
            offset = {
              top: position.top + position.height,
              left: position.left + position.width / 2 - actualWidth / 2,
            };
            break;
          case 'left':
            offset = {
              top: position.top + position.height / 2 - actualHeight / 2,
              left: position.left - actualWidth,
            };
            break;
          default:
            offset = {
              top: position.top - actualHeight,
              left: position.left + position.width / 2 - actualWidth / 2,
            };
            break;
        }

        if (!split[1]) {
          return offset;
        }

        // Add support for corners @todo css
        if (split[0] === 'top' || split[0] === 'bottom') {
          switch (split[1]) {
            case 'left':
              offset.left = position.left;
              break;
            case 'right':
              offset.left = position.left + position.width - actualWidth;
              break;
            default:

            // do nothing
          }
        } else if (split[0] === 'left' || split[0] === 'right') {
          switch (split[1]) {
            case 'top':
              offset.top = position.top - actualHeight;
              break;
            case 'bottom':
              offset.top = position.top + position.height;
              break;
            default:

            // do nothing
          }
        }

        return offset;
      }

      function applyPlacement(offset, placement) {
        const tip = tipElement[0];
        const width = tip.offsetWidth;
        const height = tip.offsetHeight;

        // manually read margins because getBoundingClientRect includes difference
        let marginTop = parseInt(OVHDimensions.css(tip, 'margin-top'), 10);
        let marginLeft = parseInt(OVHDimensions.css(tip, 'margin-left'), 10);

        // we must check for NaN for ie 8/9
        if (isNaN(marginTop)) {
          marginTop = 0;
        }
        if (isNaN(marginLeft)) {
          marginLeft = 0;
        }

        offset.top += marginTop;
        offset.left += marginLeft;

        // dimensions setOffset doesn't round pixel values
        // so we use setOffset directly with our own function
        OVHDimensions.setOffset(tip, angular.extend({
          using(props) {
            tipElement.css({
              top: `${Math.round(props.top)}px`,
              left: `${Math.round(props.left)}px`,
              right: '',
            });
          },
        }, offset), 0);

        // check to see if placing tip in new offset caused the tip to resize itself
        const actualWidth = tip.offsetWidth;
        const actualHeight = tip.offsetHeight;

        if (placement === 'top' && actualHeight !== height) {
          offset.top = offset.top + height - actualHeight;
        }

        // If it's an exotic placement, exit now instead of
        // applying a delta and changing the arrow
        if (/top-left|top-right|bottom-left|bottom-right/.test(placement)) {
          return;
        }

        const delta = getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight);

        if (delta.left) {
          offset.left += delta.left;
        } else {
          offset.top += delta.top;
        }

        OVHDimensions.setOffset(tip, offset);

        if (/top|right|bottom|left/.test(placement)) {
          const isVertical = /top|bottom/.test(placement);
          const arrowDelta = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight;
          const arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight';

          replaceArrow(arrowDelta, tip[arrowOffsetPosition], isVertical);
        }
      }

      // @source https://github.com/twbs/bootstrap/blob/v3.3.5/js/tooltip.js#L380
      function getViewportAdjustedDelta(placement, position, actualWidth, actualHeight) {
        const delta = { top: 0, left: 0 };
        if (!$tooltip.$viewport) {
          return delta;
        }

        const viewportPadding = options.viewport && options.viewport.padding || 0;
        const viewportDimensions = getPosition($tooltip.$viewport);

        if (/right|left/.test(placement)) {
          const topEdgeOffset = position.top - viewportPadding - viewportDimensions.scroll;
          const bottomEdgeOffset = position.top + viewportPadding - viewportDimensions.scroll + actualHeight;
          if (topEdgeOffset < viewportDimensions.top) { // top overflow
            delta.top = viewportDimensions.top - topEdgeOffset;
          } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
            delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset;
          }
        } else {
          const leftEdgeOffset = position.left - viewportPadding;
          const rightEdgeOffset = position.left + viewportPadding + actualWidth;
          if (leftEdgeOffset < viewportDimensions.left) { // left overflow
            delta.left = viewportDimensions.left - leftEdgeOffset;
          } else if (rightEdgeOffset > viewportDimensions.right) { // right overflow
            delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset;
          }
        }

        return delta;
      }

      function replaceArrow(delta, dimension, isHorizontal) {
        const $arrow = findElement('.tooltip-arrow, .arrow', tipElement[0]);

        $arrow.css(isHorizontal ? 'left' : 'top', `${50 * (1 - delta / dimension)}%`)
          .css(isHorizontal ? 'top' : 'left', '');
      }

      function destroyTipElement() {
        // Cancel pending callbacks
        clearTimeout(timeout);

        if ($tooltip.$isShown && tipElement !== null) {
          if (options.autoClose) {
            unbindAutoCloseEvents();
          }

          if (options.keyboard) {
            unbindKeyboardEvents();
          }
        }

        if (tipScope) {
          tipScope.$destroy();
          tipScope = null;
        }

        if (tipElement) {
          tipElement.remove();
          tipElement = $tooltip.$element = null;
        }
      }

      return $tooltip;
    }

    // var fetchPromises = {};
    // function fetchTemplate(template) {
    //   if(fetchPromises[template]) {
    //     return fetchPromises[template];
    //   }
    //   return (fetchPromises[template] = $http.get(template, {cache: $templateCache}).then(function(res) {
    //     return res.data;
    //   }));
    // }

    return TooltipFactory;
  };
}
