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

                                                   this.$get = function ($ovhtooltip) {

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

                                                   };
                                               });
