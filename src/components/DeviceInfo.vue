<template>
  <div class="device-info">
    <dl class="status">
      <dt>Connected:</dt>
      <dd><input :value="deviceName" readonly="true" />
      <a href="#" class="round-button disconnect" v-on:click="onDisconnect">
          <font-awesome-layers style="font-size: 1.5em;">
            <font-awesome-icon :icon="['fas', 'ban']"/>
            <font-awesome-icon :icon="['fab', 'bluetooth-b']" transform="shrink-6"/>
          </font-awesome-layers>
      </a>
      </dd>
      <dt><font-awesome-icon :icon="batteryIcon" size="lg" />:</dt>
      <dd>{{batteryLevel}}%</dd>
      <dt>Mem:</dt>
      <dd>{{ memoryPercent }}%</dd>
    </dl>
    <div class="time">
      <font-awesome-layers style="font-size: 4em;">
        <font-awesome-icon :icon="['far', 'square']" />
        <font-awesome-icon :icon="['far', 'clock']" transform="shrink-6" />
      </font-awesome-layers>
      <dl>
        <dt>Uptime:</dt>
        <dd>{{ upTime | formatUptime }}</dd>
        <dt>Local:</dt>
        <dd>{{ localTime | formatMoment }}</dd>
      </dl>
      <button class="synch" v-if="allowSynch" v-on:click="onSynch">Synch Clock</button>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'

export default {
  props: {
    allowSynch: {
      type: Boolean,
      default: false
    },
    device: {
      type: Object
    },
    connected: {
      type: Boolean
    }
  },
  data() {
    return {
      batteryLevel: undefined,
      memoryUsed: undefined,
      localTime: dayjs(),
      upTime: undefined
    }
  },
  created() {
    if (this.device) {
      this.device.getMemoryUsage()
        .then(value => this.memoryUsed = value)
        .then(() => this.device.getUptime())
        .then(value => this.upTime = value[0])
        .then(() => this.device.getBatteryLevel())
        .then(value => this.batteryLevel = value)
    }
  },
  methods: {
    onDisconnect: function() {
      if (this.device) {
        this.device.disconnect();
      }
    },
    onSynch: function() {
      console.log('synch')
      this.device.synchClock().then(() => console.log('finished synch'));
    }
  },
  computed: {
    batteryIcon: function() {
      if (this.batteryLevel == undefined) {
        return ['fas', 'ban']
      } else if (this.batteryLevel > 87.5) {
        return ['fas', 'battery-full']
      } else if (this.batteryLevel > 62.5){
        return ['fas', 'battery-three-quarters']
      } else if (this.batteryLevel > 37.5) {
        return ['fas', 'battery-half']
      } else if (this.batteryLevel > 15) {
        return ['fas', 'battery-quarter']
      } else {
        return ['fas', 'battery-empty']
      }
    },
    memoryPercent: function() {
      if (this.memoryUsed === undefined) {
        return undefined;
      }
      return (this.memoryUsed / 32768) * 100
    },
    deviceName: function() {
      if (this.connected && this.device) {
        return this.device.getDeviceName()
      }
      return "N/A"
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
dl {
  margin: 0;
}

dl dt {
  display:inline-block;
  margin-inline-start: 0.5em;
  margin-inline-end: 0;
}

dl dd {
  display:inline-block;
  margin-inline-start: 0;
  margin-inline-end: 0.5em;
}

dl.status dd input {
  width: 5em;
}

div.time dl {
  position: relative;
  display:inline-block;
  width: 15em;
  vertical-align: 0.75em;
  margin-top: 0;
  margin-bottom: 0;
}

div.time dl dt {
  width: 3em;
  vertical-align: middle;
  text-align: right;
  margin-inline-start: 0;
  margin-inline-end: 0.5em;
}

div.time dl dd {
  width: 10em;
  text-align: left;
  margin-inline-end: 0;
}

div.time button {
  vertical-align: 2em;
  text-align: center;
  cursor: pointer;
  outline: none;
  color: #fff;
  background-color: #4CAF50;
  border: none;
  border-radius: 15px;
  box-shadow: 0 4px #999;
}

div.time button:hover {
  background-color: #3e8e41
}

div.time button:active {
  background-color: #3e8e41;
  box-shadow: 0 2px #666;
  transform: translateY(2px);
}

a.disconnect {
  margin-left: 2px;
  vertical-align: middle;
}

</style>
