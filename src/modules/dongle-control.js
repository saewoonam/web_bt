import { SERVICE_UUID, CHARACTERISTICS, COMMANDS } from './config'
import sanitize from 'sanitize-filename'
import EventEmitter from 'events'

//const COMMAND_TIMEOUT = 5000
const noop = () => {}

function toBtValue(val) {
  if (typeof val === 'number') {
    let buf = new ArrayBuffer(4)
    let view = new DataView(buf)
    view.setUint32(0, val, true)
    return new Uint8Array(buf)
  }

  if (typeof val === 'string') {
    return Uint8Array.of(val.charCodeAt(0))
  }

  throw new Error('Cannot encode value for bluetooth write')
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

export class OutOfOrderException extends Error {
  constructor() {
    super('Received block out of order')
  }
}

export class InterruptException extends Error {
  constructor(){
    super('Interrupted')
  }
}

export const MODES = Object.freeze({
  fromValue: function(value) {
    switch(value) {
      case 0:
        return this.CALIBRATION;
      case 1:
        return this.ENCOUNTER;
      default:
        return this.UNKNOWN;
    }
  },
  CALIBRATION: {
    text: "Calibration",
    command: 'R',
    value: 0
  },
  ENCOUNTER: {
    text: "Encounter",
    command: 'E',
    value: 1
  },
  UNKNOWN: {
    text: "??",
    command: undefined,
    value: undefined
  }
});

export const ORIENTATIONS = Object.freeze({
  BASELINE: {
    value: 0
  },
  a: {
    value: 1
  },
  b: {
    value: 3
  },
  c: {
    value: 3
  },
  d: {
    value: 3
  },
  e: {
    value: 3
  },
  f: {
    value: 3
  },
  g: {
    value: 3
  }
});

// can register to listen for 'status', 'connect', 'disconnect' events,
export function Controller() {
  var bluetooth = undefined;
  var connection = undefined;
  const pubsub = new EventEmitter();

  if (!/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    bluetooth = navigator.bluetooth;
  }

  function assertConnection() {
    if (!connection) {
      throw new Error('No connection established')
    }
  }

  async function connect() {
    if (bluetooth == undefined) {
      return Promise.reject(new Error('bluetooth not available'));
    }

    // disconnect first (if necessary)
    await disconnect();

    pubsub.emit('status', 'Requesting any Bluetooth Device...');
    let options = {
      "filters": [{
        "namePrefix": "NIST",
        "services": [SERVICE_UUID]
      }]
    };
    await bluetooth.requestDevice(options)
      .then(device => {
        connection = device;
        connection.addEventListener('gattserverdisconnected', () => {
          pubsub.emit('disconnected');
        });
      })
      .then(() => connection.gatt.connect())
      .catch(e => {throw e});
    pubsub.emit('connected', connection);
  }

  async function disconnect() {
    if (!connection) { return; }
    await connection.gatt.disconnect();
    connection = undefined;
  }

  function getMemoryUsage() {
    assertConnection();

    return connection.gatt.getPrimaryService(SERVICE_UUID)
      .then(service => service.getCharacteristic(CHARACTERISTICS.count))
      .then(characteristic => characteristic.readValue())
      .then(value => value.getUint32(0, true));
  }

  function getBatteryLevel() {
    assertConnection();
    return connection.gatt.getPrimaryService(SERVICE_UUID)
      .then(service => service.getCharacteristic("battery_level"))
      .then(characteristic => characteristic.readValue())
      .then(value => value.getUint8(0));
  }

  function writeData(data) {
    return connection.gatt.getPrimaryService(SERVICE_UUID)
      .then(service => service.getCharacteristic(CHARACTERISTICS.data))
      .then(characteristic => characteristic.writeValue(data));
  }
/*
  function readData() {
    return connection.gatt.getPrimaryService(SERVICE_UUID)
      .then(service => service.getCharacteristic(CHARACTERISTICS.data))
      .then(characteristic => characteristic.readValue());
  }
*/
  function startDataNotifications(listener) {
    return connection.gatt.getPrimaryService(SERVICE_UUID)
      .then(service => service.getCharacteristic(CHARACTERISTICS.data))
      .then(characteristic => characteristic.startNotifications())
      .then(characteristic => characteristic.addEventListener('characteristicvaluechanged', listener));
  }

  function stopDataNotifications(listener) {
    return connection.gatt.getPrimaryService(SERVICE_UUID)
      .then(service => service.getCharacteristic(CHARACTERISTICS.data))
      .then(characteristic => characteristic.stopNotifications())
      .then(characteristic => characteristic.removeEventListener('characteristicvaluechanged', listener));
  }

  async function readData(command, onData) {
    assertConnection();

    let notifyCallback;
    function notify(res) {
      notifyCallback(res);
    }

    let promise = new Promise((resolve, reject) => {
      notifyCallback = handle;
      function handle(event) {
        onData(event.target.value, resolve, reject);
      }
    });

    // wait for everything to happen
    await startDataNotifications(notify);
    try {
      await writeCommand(command.value);
      let result = await promise;
      // return the result
      return result;
    } finally {
      await stopDataNotifications(notify);
    }
  }

	function writeCommand(command) {
		return connection.gatt.getPrimaryService(SERVICE_UUID)
			.then(service => service.getCharacteristic(CHARACTERISTICS.rw))
			.then(characteristic => characteristic.writeValue(toBtValue(command)));
	}

  async function setName(name) {
    if (name.length > 8){
      throw new Error('Name must be less than 8 characters');
    }
    assertConnection();
    await writeData(str2ab(name))
      .then(() => writeCommand(COMMANDS.setName.value));
  }

  function setScanParameters(interval, window) {
		let buffer = new ArrayBuffer(4);
		let view = new DataView(buffer);
		view.setUint16(0, interval, true);
		view.setUint16(2, window, true);
		return writeData(buffer)
			.then(() => writeCommand(COMMANDS.setScanParameters.value));
  }

  function writeCalibrationData(distance, orientation) {
      let buffer = new ArrayBuffer(4);
      let array = new Uint16Array(buffer);
      array[0] = distance * 100;
      array[1] = orientation.value;
      return writeData(buffer);
  }

  function synchClock() {
    var got_time = 0;
    var full_time = [0, 0];
    let start_time = (new Date()).getTime();
    let stop_time = 0;
    return readData(COMMANDS.getUptime, (value, resolve) => {
        // value is time since reboot - in ms
        let buf = value.buffer;
        let time = new Uint32Array(buf);
        full_time[got_time] = time[0];
        got_time += time.length;
        // make sure we have both numbers
        if (got_time == 2) {
          stop_time = (new Date()).getTime();
          resolve(full_time);
        }
    })
    .then(() => {
        var mean = parseInt((start_time + stop_time) / 2);
        let offset = mean % 1000;
        mean = parseInt(mean / 1000);
    
        var buffer = new ArrayBuffer(12);
        var array = new Uint32Array(buffer);
        array[0] = mean;
        array[1] = full_time[0] - offset;
        array[2] = full_time[1];
        return writeData(buffer);
    })
    .then(() => writeCommand(COMMANDS.setSynchTime.value));
  }

  async function getUptime() {
    var got_time = 0;
    var full_time = [0, 0];
    return await readData(COMMANDS.getUptime, (value, resolve) => {
        // value is time since reboot - in ms
        let buf = value.buffer;
        let time = new Uint32Array(buf);
        full_time[got_time] = time[0];
        got_time += time.length;
        // make sure we have both numbers
        if (got_time == 2) {
          resolve(full_time);
        }
    });
  }

  async function getMode() {
    return await readData(COMMANDS.getMode, (value, resolve) => {
      resolve(MODES.fromValue(value.getUint8()));
    });
  }

  async function setMode(mode) {
    if (mode.command) {
      await writeCommand(mode.command);
    }
  }

  async function fetchData(opts = { interrupt: false, onProgress: undefined }) {
    const blocksTotal = await getMemoryUsage();
    const blockSize = 32;
    const expectedLength = blocksTotal * blockSize;

    let buffer = new ArrayBuffer(expectedLength);
    let result = new Uint8Array(buffer);
  
    let notifyCallback = noop;
    function notify(res) {
      notifyCallback(res);
      notifyCallback = noop;
    }

    assertConnection();

    let index_buffer = new ArrayBuffer(4);
    let index_view = new DataView(index_buffer)
    let index = 0;
    let bytesReceived = 0;

    function nextBlock() {
      return new Promise((resolve, reject) => {
        let interval = setInterval(() => {
          if (opts.interrupt){
            clearInterval(interval)
            notifyCallback = noop;
            reject(new InterruptException())
          }
        }, 1000)
        notifyCallback = (event) => {
          let data = event.target.value;
          // first bit is the block number
          let blockNumber = data.getUint32(0, true);
          // the rest is the block
          let block = new Uint8Array(data.buffer, 4);

          if (block.byteLength === 0) {
            // drop value
            index++;
            return resolve(false);
          }

          if (blockNumber !== index) {
            return reject(new OutOfOrderException());
          }

          result.set(block, bytesReceived);
          notifyCallback = noop;
          bytesReceived += block.byteLength;
          index++;
          resolve(true);
        };
        index_view.setUint32(0, index, true);
        connection.gatt.getPrimaryService(SERVICE_UUID)
          .then(service => service.getCharacteristic(CHARACTERISTICS.data))
          .then(characteristic => characteristic.writeValue(index_view))
          .catch(err => reject(err));
      });
    }

    await startDataNotifications(notify);

    try {
      await writeCommand(COMMANDS.startDataDownload.value);
      while (bytesReceived < expectedLength) {
        if (opts.interrupt){
          throw new InterruptException()
        }
        await nextBlock();
        if (opts.onProgress) {
          opts.onProgress(bytesReceived, expectedLength);
        }
      }
    } finally {
      try {
        await stopDataNotifications(notify);
      } finally {
        await writeCommand(COMMANDS.stopDataDownload.value);
      }
    }
    return result;
  }

  return {
    connect,
    disconnect,
    getMemoryUsage,
    setName,
    fetchData,
    eraseData: () => writeCommand(COMMANDS.eraseFlash.value),
    getUptime,
    synchClock,
    getMode,
    setMode,
    getBatteryLevel,
    startRecording: () => writeCommand(COMMANDS.startWritingToFlash.value),
    stopRecording: () => writeCommand(COMMANDS.stopWritingToFlash.value),
    setMark: () => writeCommand(COMMANDS.recordPrimaryEncounterEvent.value),
    setUnmark: () => writeCommand(COMMANDS.recordSecondaryEncounterEvent.value),
    writeCalibrationData,
    setScanParameters,
    getDeviceName: () => sanitize(connection.name),
    isConnected: () => !!connection,
    on: pubsub.on.bind(pubsub),
    off: pubsub.off.bind(pubsub),
    once: pubsub.once.bind(pubsub)
  };
}
