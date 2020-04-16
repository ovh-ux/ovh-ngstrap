import angular from 'angular';

import directive from './directive';
import ovhNgStrapTooltip from '../tooltip';
import provider from './provider';
import template from './template.html';

const moduleName = 'ovhNgStrapPopover';

angular
  .module(moduleName, [ovhNgStrapTooltip])
  .provider('$ovhpopover', provider)
  .directive('ovhPopover', directive)
  .run(
    /* @ngInject */ ($templateCache) => {
      $templateCache.put(
        'popover/popover.tpl.html',
        template,
      );
    },
  );

export default moduleName;
