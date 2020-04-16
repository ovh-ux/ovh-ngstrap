import angular from 'angular';

export default /* @ngInject */ function () {
  this.defaults = {
    animation: 'am-fade',
    customClass: '',

    // uncommenting the next two lines will break backwards compatability
    // prefixClass: 'popover',
    // prefixEvent: 'popover',
    container: false,
    target: false,
    placement: 'right',
    templateUrl: 'popover/popover.tpl.html',
    contentTemplate: false,
    trigger: 'click',
    keyboard: true,
    html: false,
    title: '',
    content: '',
    delay: 0,
    autoClose: false,
  };
  const { defaults } = this;

  this.$get = function ($ovhtooltip) {
    function PopoverFactory(element, config) {
      // Common vars
      const options = angular.extend({}, defaults, config);

      const $popover = $ovhtooltip(element, options);

      // Support scope as string options [/*title, */content]
      if (options.content) {
        $popover.$scope.content = options.content;
      }

      return $popover;
    }

    return PopoverFactory;
  };
}
