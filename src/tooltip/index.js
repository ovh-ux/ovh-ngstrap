import angular from 'angular';

import directive from './directive';
import factory from './factory';
import provider from './provider';
import service from './service';
import template from './template.html';

const moduleName = 'ovhNgStrapTooltip';

angular
  .module(moduleName, [])
  .factory('OVHDimensions', factory)
  .service('OVHCompiler', service)
  .provider('$ovhtooltip', provider)
  .directive('ovhTooltip', directive)
  .run(
    /* @ngInject */ ($templateCache) => {
      $templateCache.put(
        'tooltip/tooltip.tpl.html',
        template,
      );
    },
  );

export default moduleName;
