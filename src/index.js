import angular from 'angular';

import popover from './popover';
import tooltip from './tooltip';

const moduleName = 'ovhNgStrap';

angular
  .module(moduleName, [popover, tooltip]);

export default moduleName;
