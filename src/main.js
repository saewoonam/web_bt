import Vue from 'vue'
import App from './App.vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faClock, faSquare, faCircle as farCircle } from '@fortawesome/free-regular-svg-icons'
import { faBatteryEmpty, faBatteryQuarter, faBatteryHalf, faBatteryThreeQuarters, faBatteryFull } from '@fortawesome/free-solid-svg-icons'
import { faCircle as fasCircle, faSquare as fasSquare, faBan as fasBan } from '@fortawesome/free-solid-svg-icons'

import { faBluetoothB } from '@fortawesome/free-brands-svg-icons'

import { FontAwesomeLayers, FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faBatteryEmpty, faBatteryQuarter, faBatteryHalf, faBatteryThreeQuarters, faBatteryFull, faClock, faSquare, farCircle, fasCircle, fasSquare, fasBan, faBluetoothB)

Vue.component('font-awesome-icon', FontAwesomeIcon)
Vue.component('font-awesome-layers', FontAwesomeLayers)

Vue.filter('formatMoment', function(value) {
  if (value) {
    return value.format('MM/DD/YY HH:mm ZZ')
  } else {
    return "N/A"
  }
})

Vue.filter('formatUptime', function(value) {
  if (value) {
    var dividewithremain = function(dividend, divisor) {
      var result = [0, 0];
      result[1] = dividend % divisor;
      result[0] = (dividend - result[1]) / divisor;
      return result;
    }
    var d = dividewithremain(value, 24 * 60 * 60 * 1000);
    var h = dividewithremain(d[1], 60 * 60 * 1000);
    var m = dividewithremain(h[1], 60 * 1000);
    var s = dividewithremain(m[1], 1000);
    var pad = function(n) { return n < 10 ? '0' + n : n; };
    return [pad(d[0]), pad(h[0]), pad(m[0]), pad(s[0])].join(':') + ' (D:H:M:S)';
  } else {
    return "N/A"
  }
})

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
