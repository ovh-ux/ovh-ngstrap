"use strict";

angular.module("ovh-ngStrap", [
    "ovh-ngStrap-tooltip",
    "ovh-ngStrap-popover"
]);

"use strict";

angular.module("ovh-ngStrap-helpers-compiler", []);

"use strict";

angular.module("ovh-ngStrap-helpers-compiler").service("OVHCompiler", ["$q", "$http", "$injector", "$compile", "$controller", "$templateCache", function ($q, $http, $injector, $compile, $controller, $templateCache) {
    /*
   * @ngdoc service
   * @name $bsCompiler
   * @module material.core
   * @description
   * The $bsCompiler service is an abstraction of angular's compiler, that allows the developer
   * to easily compile an element with a templateUrl, controller, and locals.
   *
   * @usage
   * <hljs lang="js">
   * $bsCompiler.compile({
   *   templateUrl: 'modal.html',
   *   controller: 'ModalCtrl',
   *   locals: {
   *     modal: myModalInstance;
   *   }
   * }).then(function(compileData) {
   *   compileData.element; // modal.html's template in an element
   *   compileData.link(myScope); //attach controller & scope to element
   * });
   * </hljs>
   */

    /*
    * @ngdoc method
    * @name $bsCompiler#compile
    * @description A helper to compile an HTML template/templateUrl with a given controller,
    * locals, and scope.
    * @param {object} options An options object, with the following properties:
    *
    *    - `controller` - `{(string=|function()=}` Controller fn that should be associated with
    *      newly created scope or the name of a registered controller if passed as a string.
    *    - `controllerAs` - `{string=}` A controller alias name. If present the controller will be
    *      published to scope under the `controllerAs` name.
    *    - `template` - `{string=}` An html template as a string.
    *    - `templateUrl` - `{string=}` A path to an html template.
    *    - `transformTemplate` - `{function(template)=}` A function which transforms the template after
    *      it is loaded. It will be given the template string as a parameter, and should
    *      return a a new string representing the transformed template.
    *    - `resolve` - `{Object.<string, function>=}` - An optional map of dependencies which should
    *      be injected into the controller. If any of these dependencies are promises, the compiler
    *      will wait for them all to be resolved, or if one is rejected before the controller is
    *      instantiated `compile()` will fail..
    *      * `key` - `{string}`: a name of a dependency to be injected into the controller.
    *      * `factory` - `{string|function}`: If `string` then it is an alias for a service.
    *        Otherwise if function, then it is injected and the return value is treated as the
    *        dependency. If the result is a promise, it is resolved before its value is
    *        injected into the controller.
    *
    * @returns {object=} promise A promise, which will be resolved with a `compileData` object.
    * `compileData` has the following properties:
    *
    *   - `element` - `{element}`: an uncompiled element matching the provided template.
    *   - `link` - `{function(scope)}`: A link function, which, when called, will compile
    *     the element and instantiate the provided controller (if given).
    *   - `locals` - `{object}`: The locals which will be passed into the controller once `link` is
    *     called. If `bindToController` is true, they will be coppied to the ctrl instead
    *   - `bindToController` - `bool`: bind the locals to the controller, instead of passing them in.
    */
    this.compile = function (options) {

        if (options.template && /\.html$/.test(options.template)) {
            console.warn("Deprecated use of `template` option to pass a file. Please use the `templateUrl` option instead."); // eslint-disable-line no-console
            options.templateUrl = options.template;
            options.template = "";
        }

        var templateUrl = options.templateUrl;
        var template = options.template || "";
        var controller = options.controller;
        var controllerAs = options.controllerAs;
        var resolve = angular.copy(options.resolve || {});
        var locals = angular.copy(options.locals || {});
        var transformTemplate = options.transformTemplate || angular.identity;
        var bindToController = options.bindToController;

        // Take resolve values and invoke them.
        // Resolves can either be a string (value: 'MyRegisteredAngularConst'),
        // or an invokable 'factory' of sorts: (value: function ValueGetter($dependency) {})
        angular.forEach(resolve, function (value, key) {
            if (angular.isString(value)) {
                resolve[key] = $injector.get(value);
            } else {
                resolve[key] = $injector.invoke(value);
            }
        });

        // Add the locals, which are just straight values to inject
        // eg locals: { three: 3 }, will inject three into the controller
        angular.extend(resolve, locals);

        if (templateUrl) {
            resolve.$template = fetchTemplate(templateUrl);
        } else {
            resolve.$template = $q.when(template);
        }

        if (options.contentTemplate) {
            // TODO(mgcrea): deprecate?
            resolve.$template = $q.all([resolve.$template, fetchTemplate(options.contentTemplate)])
                .then(function (templates) {
                    var templateEl = angular.element(templates[0]);
                    var contentEl = findElement('[ng-bind="content"]', templateEl[0]).removeAttr("ng-bind").html(templates[1]);

                    // Drop the default footer as you probably don't want it if you use a custom contentTemplate
                    if (!options.templateUrl) {
                        contentEl.next().remove();
                    }
                    return templateEl[0].outerHTML;
                });
        }

        // Wait for all the resolves to finish if they are promises
        return $q.all(resolve).then(function (locals) {

            var template = transformTemplate(locals.$template);
            if (options.html) {
                template = template.replace(/ng-bind="/ig, 'ng-bind-html="');
            }

            // var element = options.element || angular.element('<div>').html(template.trim()).contents();
            var element = angular.element("<div>").html(template.trim()).contents();
            var linkFn = $compile(element);

            // Return a linking function that can be used later when the element is ready
            return {
                locals: locals,
                element: element,
                link: function link (scope) {
                    locals.$scope = scope;

                    // Instantiate controller if it exists, because we have scope
                    if (controller) {
                        var invokeCtrl = $controller(controller, locals, true);
                        if (bindToController) {
                            angular.extend(invokeCtrl.instance, locals);
                        }

                        // Support angular@~1.2 invokeCtrl
                        var ctrl = angular.isObject(invokeCtrl) ? invokeCtrl : invokeCtrl();

                        // See angular-route source for this logic
                        element.data("$ngControllerController", ctrl);
                        element.children().data("$ngControllerController", ctrl);

                        if (controllerAs) {
                            scope[controllerAs] = ctrl;
                        }
                    }

                    return linkFn.apply(null, arguments);
                }
            };
        });

    };

    function findElement (query, element) {
        return angular.element((element || document).querySelectorAll(query));
    }

    var fetchPromises = {};
    function fetchTemplate (template) {
        if (fetchPromises[template]) {
            return fetchPromises[template];
        }
        return (fetchPromises[template] = $http.get(template, { cache: $templateCache })
            .then(function (res) {
                return res.data;
            }));
    }
}]);

"use strict";

angular.module("ovh-ngStrap-helpers-dimensions", []);

"use strict";

angular.module("ovh-ngStrap-helpers-dimensions").factory("OVHDimensions", function () {

    var fn = {};

    /**
     * Test the element nodeName
     * @param element
     * @param name
     */
    var nodeName = fn.nodeName = function (element, name) {
        return element.nodeName && element.nodeName.toLowerCase() === name.toLowerCase();
    };

    /**
     * Returns the element computed style
     * @param element
     * @param prop
     * @param extra
     */
    fn.css = function (element, prop, extra) {
        var value;
        if (element.currentStyle) { // IE
            value = element.currentStyle[prop];
        } else if (window.getComputedStyle) {
            value = window.getComputedStyle(element)[prop];
        } else {
            value = element.style[prop];
        }
        return extra === true ? parseFloat(value) || 0 : value;
    };

    /**
     * Provides read-only equivalent of jQuery's offset function:
     * @required-by bootstrap-tooltip, bootstrap-affix
     * @url http://api.jquery.com/offset/
     * @param element
     */
    fn.offset = function (element) {
        var boxRect = element.getBoundingClientRect();
        var docElement = element.ownerDocument;
        return {
            width: boxRect.width || element.offsetWidth,
            height: boxRect.height || element.offsetHeight,
            top: boxRect.top + (window.pageYOffset || docElement.documentElement.scrollTop) - (docElement.documentElement.clientTop || 0),
            left: boxRect.left + (window.pageXOffset || docElement.documentElement.scrollLeft) - (docElement.documentElement.clientLeft || 0)
        };
    };

    /**
     * Provides set equivalent of jQuery's offset function:
     * @required-by bootstrap-tooltip
     * @url http://api.jquery.com/offset/
     * @param element
     * @param options
     * @param i
     */
    fn.setOffset = function (element, options, i) {
        var curPosition;
        var curLeft;
        var curCSSTop;
        var curTop;
        var curOffset;
        var curCSSLeft;
        var calculatePosition;
        var position = fn.css(element, "position");
        var curElem = angular.element(element);
        var props = {};

        // Set position first, in-case top/left are set even on static elem
        if (position === "static") {
            element.style.position = "relative";
        }

        curOffset = fn.offset(element);
        curCSSTop = fn.css(element, "top");
        curCSSLeft = fn.css(element, "left");
        calculatePosition = (position === "absolute" || position === "fixed") &&
                          (curCSSTop + curCSSLeft).indexOf("auto") > -1;

        // Need to be able to calculate position if either
        // top or left is auto and position is either absolute or fixed
        if (calculatePosition) {
            curPosition = fn.position(element);
            curTop = curPosition.top;
            curLeft = curPosition.left;
        } else {
            curTop = parseFloat(curCSSTop) || 0;
            curLeft = parseFloat(curCSSLeft) || 0;
        }

        if (angular.isFunction(options)) {
            options = options.call(element, i, curOffset); // eslint-disable-line no-param-reassign
        }

        if (options.top !== null) {
            props.top = (options.top - curOffset.top) + curTop;
        }
        if (options.left !== null) {
            props.left = (options.left - curOffset.left) + curLeft;
        }

        if ("using" in options) {
            options.using.call(curElem, props);
        } else {
            curElem.css({
                top: props.top + "px",
                left: props.left + "px"
            });
        }
    };

    /**
     * Provides read-only equivalent of jQuery's position function
     * @required-by bootstrap-tooltip, bootstrap-affix
     * @url http://api.jquery.com/offset/
     * @param element
     */
    fn.position = function (element) {

        var offsetParentRect = { top: 0, left: 0 };
        var offsetParentElement;
        var offset;

        // Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is it's only offset parent
        if (fn.css(element, "position") === "fixed") {

            // We assume that getBoundingClientRect is available when computed position is fixed
            offset = element.getBoundingClientRect();

        } else {

            // Get *real* offsetParentElement
            offsetParentElement = offsetParent(element);

            // Get correct offsets
            offset = fn.offset(element);
            if (!nodeName(offsetParentElement, "html")) {
                offsetParentRect = fn.offset(offsetParentElement);
            }

            // Add offsetParent borders
            offsetParentRect.top += fn.css(offsetParentElement, "borderTopWidth", true);
            offsetParentRect.left += fn.css(offsetParentElement, "borderLeftWidth", true);
        }

        // Subtract parent offsets and element margins
        return {
            width: element.offsetWidth,
            height: element.offsetHeight,
            top: offset.top - offsetParentRect.top - fn.css(element, "marginTop", true),
            left: offset.left - offsetParentRect.left - fn.css(element, "marginLeft", true)
        };

    };

    /**
     * Returns the closest, non-statically positioned offsetParent of a given element
     * @required-by fn.position
     * @param element
     */
    var offsetParent = function offsetParentElement (element) {
        var docElement = element.ownerDocument;
        var offsetParent = element.offsetParent || docElement;
        if (nodeName(offsetParent, "#document")) {
            return docElement.documentElement;
        }
        while (offsetParent && !nodeName(offsetParent, "html") && fn.css(offsetParent, "position") === "static") {
            offsetParent = offsetParent.offsetParent;
        }
        return offsetParent || docElement.documentElement;
    };

    /**
     * Provides equivalent of jQuery's height function
     * @required-by bootstrap-affix
     * @url http://api.jquery.com/height/
     * @param element
     * @param outer
     */
    fn.height = function (element, outer) {
        var value = element.offsetHeight;
        if (outer) {
            value += fn.css(element, "marginTop", true) + fn.css(element, "marginBottom", true);
        } else {
            value -= fn.css(element, "paddingTop", true) + fn.css(element, "paddingBottom", true) + fn.css(element, "borderTopWidth", true) + fn.css(element, "borderBottomWidth", true);
        }
        return value;
    };

    /**
     * Provides equivalent of jQuery's width function
     * @required-by bootstrap-affix
     * @url http://api.jquery.com/width/
     * @param element
     * @param outer
     */
    fn.width = function (element, outer) {
        var value = element.offsetWidth;
        if (outer) {
            value += fn.css(element, "marginLeft", true) + fn.css(element, "marginRight", true);
        } else {
            value -= fn.css(element, "paddingLeft", true) + fn.css(element, "paddingRight", true) + fn.css(element, "borderLeftWidth", true) + fn.css(element, "borderRightWidth", true);
        }
        return value;
    };

    return fn;

});

"use strict";

angular.module("ovh-ngStrap-tooltip", ["ovh-ngStrap-helpers-compiler", "ovh-ngStrap-helpers-dimensions"]);

angular.module("ovh-ngStrap-tooltip").provider("$ovhtooltip", function () {

    "use strict";

    var defaults = this.defaults = {
        animation: "am-fade",
        customClass: "",
        prefixClass: "tooltip",
        prefixEvent: "tooltip",
        container: false,
        target: false,
        placement: "top",
        templateUrl: "tooltip/tooltip.tpl.html",
        template: "",
        contentTemplate: false,
        trigger: "hover focus",
        keyboard: false,
        html: false,
        show: false,
        title: "",
        type: "",
        delay: 0,
        autoClose: false,
        bsEnabled: true,
        viewport: {
            selector: "body",
            padding: 0
        }
    };

    this.$get = ["$window", "$rootScope", "OVHCompiler", "$q", "$templateCache", "$http", "$animate", "$sce", "OVHDimensions", "$$rAF", "$timeout", function ($window, $rootScope, OVHCompiler, $q, $templateCache, $http, $animate, $sce, OVHDimensions, $$rAF, $timeout) {

        // var trim = String.prototype.trim;
        var isTouch = "createTouch" in $window.document;

        // var htmlReplaceRegExp = /ng-bind="/ig;
        var $body = angular.element($window.document);

        function TooltipFactory (element, config) {

            var $tooltip = {};

            // Common vars
            var options = $tooltip.$options = angular.extend({}, defaults, config);
            var promise = $tooltip.$promise = OVHCompiler.compile(options);
            var scope = $tooltip.$scope = (options.scope && options.scope.$new()) || $rootScope.$new();

            var nodeName = element[0].nodeName.toLowerCase();
            if (options.delay && angular.isString(options.delay)) {
                var split = options.delay.split(",").map(parseFloat);
                options.delay = split.length > 1 ? { show: split[0], hide: split[1] } : split[0];
            }

            // Store $id to identify the triggering element in events
            // give priority to options.id, otherwise, try to use
            // element id if defined
            $tooltip.$id = options.id || element.attr("id") || "";

            // Support scope as string options
            if (options.title) {
                scope.title = $sce.trustAsHtml(options.title);
            }

            // Provide scope helpers
            scope.$setEnabled = function (isEnabled) {
                scope.$$postDigest(function () {
                    $tooltip.setEnabled(isEnabled);
                });
            };
            scope.$hide = function () {
                scope.$$postDigest(function () {
                    $tooltip.hide();
                });
            };
            scope.$show = function () {
                scope.$$postDigest(function () {
                    $tooltip.show();
                });
            };
            scope.$toggle = function () {
                scope.$$postDigest(function () {
                    $tooltip.toggle();
                });
            };

            // Publish isShown as a protected var on scope
            $tooltip.$isShown = scope.$isShown = false;

            // Private vars
            var timeout;
            var hoverState;

            // Fetch, compile then initialize tooltip
            var compileData;
            var tipElement;
            var tipContainer;
            var tipScope;
            promise.then(function (data) {
                compileData = data;
                $tooltip.init();
            });

            $tooltip.init = function () {

                // Options: delay
                if (options.delay && angular.isNumber(options.delay)) {
                    options.delay = {
                        show: options.delay,
                        hide: options.delay
                    };
                }

                // Replace trigger on touch devices ?
                // if(isTouch && options.trigger === defaults.trigger) {
                //   options.trigger.replace(/hover/g, 'click');
                // }

                // Options : container
                if (options.container === "self") {
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
                    scope.$$postDigest(function () {
                        if (options.trigger === "focus") {
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
                hoverState = "in";
                if (!options.delay || !options.delay.show) {
                    return $tooltip.show();
                }

                timeout = setTimeout(function () {
                    if (hoverState === "in") {
                        $tooltip.show();
                    }
                }, options.delay.show);

            };

            $tooltip.show = function () {
                if (!options.bsEnabled || $tooltip.$isShown) {
                    return;
                }

                scope.$emit(options.prefixEvent + ".show.before", $tooltip);
                var parent;
                var after;
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
                tipElement = $tooltip.$element = compileData.link(tipScope, function () {}); // eslint-disable-line no-empty-function

                // Set the initial positioning.  Make the tooltip invisible
                // so IE doesn't try to focus on it off screen.
                tipElement.css({ top: "-9999px", left: "-9999px", right: "auto", display: "block", visibility: "hidden" });

                // Options: animation
                if (options.animation) {
                    tipElement.addClass(options.animation);
                }

                // Options: type
                if (options.type) {
                    tipElement.addClass(options.prefixClass + "-" + options.type);
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

                $$rAF(function () {
                    // Once the tooltip is placed and the animation starts, make the tooltip visible
                    if (tipElement) {
                        tipElement.css({ visibility: "visible" });
                    }
                });

                // Bind events
                if (options.keyboard) {
                    if (options.trigger !== "focus") {
                        $tooltip.focus();
                    }
                    bindKeyboardEvents();
                }

                if (options.autoClose) {
                    bindAutoCloseEvents();
                }

            };

            function enterAnimateCallback () {
                scope.$emit(options.prefixEvent + ".show", $tooltip);
            }

            $tooltip.leave = function () {

                clearTimeout(timeout);
                hoverState = "out";
                if (!options.delay || !options.delay.hide) {
                    return $tooltip.hide();
                }
                timeout = setTimeout(function () {
                    if (hoverState === "out") {
                        $tooltip.hide();
                    }
                }, options.delay.hide);

            };

            var _blur; // eslint-disable-line no-underscore-dangle
            var _tipToHide; // eslint-disable-line no-underscore-dangle
            $tooltip.hide = function (blur) {

                if (!$tooltip.$isShown) {
                    return;
                }
                scope.$emit(options.prefixEvent + ".hide.before", $tooltip);

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

            function leaveAnimateCallback () {
                scope.$emit(options.prefixEvent + ".hide", $tooltip);

                // check if current tipElement still references
                // the same element when hide was called
                if (tipElement === _tipToHide) {
                    // Allow to blur the input when hidden, like when pressing enter key
                    if (_blur && options.trigger === "focus") {
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
                var placement = options.placement;
                var autoToken = /\s?auto?\s?/i;
                var autoPlace = autoToken.test(placement);

                if (autoPlace) {
                    placement = placement.replace(autoToken, "") || defaults.placement;
                }

                // Need to add the position class before we get
                // the offsets
                tipElement.addClass(options.placement);

                // Get the position of the target element
                // and the height and width of the tooltip so we can center it.
                var elementPosition = getPosition();
                var tipWidth = tipElement.prop("offsetWidth");
                var tipHeight = tipElement.prop("offsetHeight");

                // Refresh viewport position
                $tooltip.$viewport = options.viewport && findElement(options.viewport.selector || options.viewport);

                // If we're auto placing, we need to check the positioning
                if (autoPlace) {
                    var originalPlacement = placement;
                    var viewportPosition = getPosition($tooltip.$viewport);

                    // Determine if the vertical placement
                    if (originalPlacement.indexOf("bottom") >= 0 && elementPosition.bottom + tipHeight > viewportPosition.bottom) {
                        placement = originalPlacement.replace("bottom", "top");
                    } else if (originalPlacement.indexOf("top") >= 0 && elementPosition.top - tipHeight < viewportPosition.top) {
                        placement = originalPlacement.replace("top", "bottom");
                    }

                    // Determine the horizontal placement
                    // The exotic placements of left and right are opposite of the standard placements.  Their arrows are put on the left/right
                    // and flow in the opposite direction of their placement.
                    if ((originalPlacement === "right" || originalPlacement === "bottom-left" || originalPlacement === "top-left") &&
elementPosition.right + tipWidth > viewportPosition.width) {

                        placement = originalPlacement === "right" ? "left" : placement.replace("left", "right");
                    } else if ((originalPlacement === "left" || originalPlacement === "bottom-right" || originalPlacement === "top-right") &&
elementPosition.left - tipWidth < viewportPosition.left) {

                        placement = originalPlacement === "left" ? "right" : placement.replace("right", "left");
                    }

                    tipElement.removeClass(originalPlacement).addClass(placement);
                }

                // Get the tooltip's top and left coordinates to center it with this directive.
                var tipPosition = getCalculatedOffset(placement, elementPosition, tipWidth, tipHeight);
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
            function bindTriggerEvents () {
                var triggers = options.trigger.split(" ");
                angular.forEach(triggers, function (trigger) {
                    if (trigger === "click") {
                        element.on("click", $tooltip.toggle);
                    } else if (trigger !== "manual") {
                        element.on(trigger === "hover" ? "mouseenter" : "focus", $tooltip.enter);
                        element.on(trigger === "hover" ? "mouseleave" : "blur", $tooltip.leave);
                        if (nodeName === "button" && trigger !== "hover") {
                            if (isTouch) {
                                element.on("touchstart", $tooltip.$onFocusElementMouseDown);
                            } else {
                                element.on("mousedown", $tooltip.$onFocusElementMouseDown);
                            }
                        }
                    }
                });
            }

            function unbindTriggerEvents () {
                var triggers = options.trigger.split(" ");
                for (var i = triggers.length; i--;) {
                    var trigger = triggers[i];
                    if (trigger === "click") {
                        element.off("click", $tooltip.toggle);
                    } else if (trigger !== "manual") {
                        element.off(trigger === "hover" ? "mouseenter" : "focus", $tooltip.enter);
                        element.off(trigger === "hover" ? "mouseleave" : "blur", $tooltip.leave);
                        if (nodeName === "button" && trigger !== "hover") {
                            if (isTouch) {
                                element.on("touchstart", $tooltip.$onFocusElementMouseDown);
                            } else {
                                element.on("mousedown", $tooltip.$onFocusElementMouseDown);
                            }
                        }
                    }
                }
            }

            function bindKeyboardEvents () {
                if (options.trigger !== "focus") {
                    tipElement.on("keyup", $tooltip.$onKeyUp);
                } else {
                    element.on("keyup", $tooltip.$onFocusKeyUp);
                }
            }

            function unbindKeyboardEvents () {
                if (options.trigger !== "focus") {
                    tipElement.off("keyup", $tooltip.$onKeyUp);
                } else {
                    element.off("keyup", $tooltip.$onFocusKeyUp);
                }
            }

            var _autoCloseEventsBinded = false; // eslint-disable-line no-underscore-dangle
            function bindAutoCloseEvents () {
                // use timeout to hookup the events to prevent
                // event bubbling from being processed imediately.
                $timeout(function () {
                    // Stop propagation when clicking inside tooltip
                    tipElement.on("click", stopEventPropagation);

                    // Hide when clicking outside tooltip
                    $body.on("click", $tooltip.hide);

                    _autoCloseEventsBinded = true;
                }, 0, false);
            }

            function unbindAutoCloseEvents () {
                if (_autoCloseEventsBinded) {
                    tipElement.off("click", stopEventPropagation);
                    $body.off("click", $tooltip.hide);
                    _autoCloseEventsBinded = false;
                }
            }

            function stopEventPropagation (event) {
                event.stopPropagation();
            }

            // Private methods

            function getPosition ($element) {
                $element = $element || (options.target || element); // eslint-disable-line no-param-reassign

                var el = $element[0];
                var isBody = el.tagName === "BODY";

                var elRect = el.getBoundingClientRect();
                var rect = {};

                // IE8 has issues with angular.extend and using elRect directly.
                // By coping the values of elRect into a new object, we can continue to use extend
                for (var p in elRect) { // eslint-disable-line guard-for-in
                    // DO NOT use hasOwnProperty when inspecting the return of getBoundingClientRect.
                    rect[p] = elRect[p];
                }

                if (rect.width === null) {
                    // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
                    rect = angular.extend({}, rect, { width: elRect.right - elRect.left, height: elRect.bottom - elRect.top });
                }
                var elOffset = isBody ? { top: 0, left: 0 } : OVHDimensions.offset(el);
                var scroll = { scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.prop("scrollTop") || 0 };
                var outerDims = isBody ? { width: document.documentElement.clientWidth, height: $window.innerHeight } : null;

                return angular.extend({}, rect, scroll, outerDims, elOffset);
            }

            function getCalculatedOffset (placement, position, actualWidth, actualHeight) {
                var offset;
                var split = placement.split("-");

                switch (split[0]) {
                case "right":
                    offset = {
                        top: position.top + position.height / 2 - actualHeight / 2,
                        left: position.left + position.width
                    };
                    break;
                case "bottom":
                    offset = {
                        top: position.top + position.height,
                        left: position.left + position.width / 2 - actualWidth / 2
                    };
                    break;
                case "left":
                    offset = {
                        top: position.top + position.height / 2 - actualHeight / 2,
                        left: position.left - actualWidth
                    };
                    break;
                default:
                    offset = {
                        top: position.top - actualHeight,
                        left: position.left + position.width / 2 - actualWidth / 2
                    };
                    break;
                }

                if (!split[1]) {
                    return offset;
                }

                // Add support for corners @todo css
                if (split[0] === "top" || split[0] === "bottom") {
                    switch (split[1]) {
                    case "left":
                        offset.left = position.left;
                        break;
                    case "right":
                        offset.left = position.left + position.width - actualWidth;
                        break;
                    default:

                        // do nothing
                    }
                } else if (split[0] === "left" || split[0] === "right") {
                    switch (split[1]) {
                    case "top":
                        offset.top = position.top - actualHeight;
                        break;
                    case "bottom":
                        offset.top = position.top + position.height;
                        break;
                    default:

                        // do nothing
                    }
                }

                return offset;
            }

            function applyPlacement (offset, placement) {
                var tip = tipElement[0];
                var width = tip.offsetWidth;
                var height = tip.offsetHeight;

                // manually read margins because getBoundingClientRect includes difference
                var marginTop = parseInt(OVHDimensions.css(tip, "margin-top"), 10);
                var marginLeft = parseInt(OVHDimensions.css(tip, "margin-left"), 10);

                // we must check for NaN for ie 8/9
                if (isNaN(marginTop)) {
                    marginTop = 0;
                }
                if (isNaN(marginLeft)) {
                    marginLeft = 0;
                }

                offset.top = offset.top + marginTop;
                offset.left = offset.left + marginLeft;

                // dimensions setOffset doesn't round pixel values
                // so we use setOffset directly with our own function
                OVHDimensions.setOffset(tip, angular.extend({
                    using: function (props) {
                        tipElement.css({
                            top: Math.round(props.top) + "px",
                            left: Math.round(props.left) + "px",
                            right: ""
                        });
                    }
                }, offset), 0);

                // check to see if placing tip in new offset caused the tip to resize itself
                var actualWidth = tip.offsetWidth;
                var actualHeight = tip.offsetHeight;

                if (placement === "top" && actualHeight !== height) {
                    offset.top = offset.top + height - actualHeight;
                }

                // If it's an exotic placement, exit now instead of
                // applying a delta and changing the arrow
                if (/top-left|top-right|bottom-left|bottom-right/.test(placement)) {
                    return;
                }

                var delta = getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight);

                if (delta.left) {
                    offset.left += delta.left;
                } else {
                    offset.top += delta.top;
                }

                OVHDimensions.setOffset(tip, offset);

                if (/top|right|bottom|left/.test(placement)) {
                    var isVertical = /top|bottom/.test(placement);
                    var arrowDelta = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight;
                    var arrowOffsetPosition = isVertical ? "offsetWidth" : "offsetHeight";

                    replaceArrow(arrowDelta, tip[arrowOffsetPosition], isVertical);
                }
            }

            // @source https://github.com/twbs/bootstrap/blob/v3.3.5/js/tooltip.js#L380
            function getViewportAdjustedDelta (placement, position, actualWidth, actualHeight) {
                var delta = { top: 0, left: 0 };
                if (!$tooltip.$viewport) {
                    return delta;
                }

                var viewportPadding = options.viewport && options.viewport.padding || 0;
                var viewportDimensions = getPosition($tooltip.$viewport);

                if (/right|left/.test(placement)) {
                    var topEdgeOffset = position.top - viewportPadding - viewportDimensions.scroll;
                    var bottomEdgeOffset = position.top + viewportPadding - viewportDimensions.scroll + actualHeight;
                    if (topEdgeOffset < viewportDimensions.top) { // top overflow
                        delta.top = viewportDimensions.top - topEdgeOffset;
                    } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
                        delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset;
                    }
                } else {
                    var leftEdgeOffset = position.left - viewportPadding;
                    var rightEdgeOffset = position.left + viewportPadding + actualWidth;
                    if (leftEdgeOffset < viewportDimensions.left) { // left overflow
                        delta.left = viewportDimensions.left - leftEdgeOffset;
                    } else if (rightEdgeOffset > viewportDimensions.right) { // right overflow
                        delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset;
                    }
                }

                return delta;
            }

            function replaceArrow (delta, dimension, isHorizontal) {
                var $arrow = findElement(".tooltip-arrow, .arrow", tipElement[0]);

                $arrow.css(isHorizontal ? "left" : "top", 50 * (1 - delta / dimension) + "%")
                    .css(isHorizontal ? "top" : "left", "");
            }

            function destroyTipElement () {
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

        // Helper functions

        function safeDigest (scope) {
            if (!scope.$$phase && !(scope.$root && scope.$root.$$phase)) {
                scope.$digest();
            }
        }

        function findElement (query, element) {
            return angular.element((element || document).querySelectorAll(query));
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

    }];

});

angular.module("ovh-ngStrap-tooltip").directive("ovhTooltip", ["$window", "$location", "$sce", "$ovhtooltip", "$$rAF", function ($window, $location, $sce, $ovhtooltip, $$rAF) {
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

}]);

angular.module("ovh-ngStrap-tooltip").run(["$templateCache", function ($templateCache) {

    "use strict";

    $templateCache.put("tooltip/tooltip.tpl.html", '<div class="tooltip in" ng-show="title"><div class="tooltip-arrow"></div><div class="tooltip-inner" ng-bind="title"></div></div>');

}]);

"use strict";

angular.module("ovh-ngStrap-popover", ["ovh-ngStrap-tooltip"]);

"use strict";

angular.module("ovh-ngStrap-popover").provider("$ovhpopover",
                                               function () {
                                                   var defaults = this.defaults = {
                                                       animation: "am-fade",
                                                       customClass: "",

                                                       // uncommenting the next two lines will break backwards compatability
                                                       // prefixClass: 'popover',
                                                       // prefixEvent: 'popover',
                                                       container: false,
                                                       target: false,
                                                       placement: "right",
                                                       templateUrl: "popover/popover.tpl.html",
                                                       contentTemplate: false,
                                                       trigger: "click",
                                                       keyboard: true,
                                                       html: false,
                                                       title: "",
                                                       content: "",
                                                       delay: 0,
                                                       autoClose: false
                                                   };

                                                   this.$get = ["$ovhtooltip", function ($ovhtooltip) {

                                                       function PopoverFactory (element, config) {

                                                           // Common vars
                                                           var options = angular.extend({}, defaults, config);

                                                           var $popover = $ovhtooltip(element, options);

                                                           // Support scope as string options [/*title, */content]
                                                           if (options.content) {
                                                               $popover.$scope.content = options.content;
                                                           }

                                                           return $popover;

                                                       }

                                                       return PopoverFactory;

                                                   }];
                                               });

"use strict";
angular.module("ovh-ngStrap-popover").directive("ovhPopover", ["$window", "$sce", "$ovhpopover", function ($window, $sce, $ovhpopover) {

    var requestAnimationFrame = $window.requestAnimationFrame || $window.setTimeout;

    return {
        restrict: "EAC",
        scope: true,
        link: function postLink (scope, element, attr) {

            // Directive options
            var options = { scope: scope };
            angular.forEach([
                "template",
                "templateUrl",
                "controller",
                "controllerAs",
                "contentTemplate",
                "placement",
                "container",
                "delay",
                "trigger",
                "html",
                "animation",
                "customClass",
                "autoClose",
                "id",
                "prefixClass",
                "prefixEvent"
            ], function (key) {
                if (angular.isDefined(attr[key])) {
                    options[key] = attr[key];
                }
            });

            // use string regex match boolean attr falsy values, leave truthy values be
            var falseValueRegExp = /^(false|0|)$/i;
            angular.forEach(["html", "container", "autoClose"], function (key) {
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

            // Support scope as data-attrs
            angular.forEach(["title", "content"], function (key) {
                if (attr[key]) {
                    attr.$observe(key, function (newValue, oldValue) {
                        scope[key] = $sce.trustAsHtml(newValue);
                        if (angular.isDefined(oldValue)) {
                            requestAnimationFrame(function () {
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
                scope.$watch(attr.bsPopover, function (newValue, oldValue) {
                    if (angular.isObject(newValue)) {
                        angular.extend(scope, newValue);
                    } else {
                        scope.content = newValue;
                    }
                    if (angular.isDefined(oldValue)) {
                        requestAnimationFrame(function () {
                            if (popover) {
                                popover.$applyPlacement();
                            }
                        });
                    }
                }, true);
            }

            // Visibility binding support
            if (attr.bsShow) {
                scope.$watch(attr.bsShow, function (newValue) {
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
                scope.$watch(attr.viewport, function (newValue) {
                    if (!popover || !angular.isDefined(newValue)) {
                        return;
                    }
                    popover.setViewport(newValue);
                });
            }

            // Initialize popover
            var popover = $ovhpopover(element, options);

            // Garbage collection
            scope.$on("$destroy", function () {
                if (popover) {
                    popover.destroy();
                }
                options = null;
                popover = null;
            });

        }
    };

}]);

angular.module("ovh-ngStrap-popover").run(["$templateCache", function ($templateCache) {

    "use strict";

    $templateCache.put("popover/popover.tpl.html", '<div class="popover"><div class="arrow"></div><h3 class="popover-title" ng-bind="title" ng-show="title"></h3><div class="popover-content" ng-bind="content"></div></div>');

}]);
