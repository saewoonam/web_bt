// import {
// 	SERVICE_UUID,
// 	CHARACTERISTICS,
// 	COMMANDS
// } from '../config'
// const SERVER_SYNC_URL = 'http://68.183.130.247:8000/upload'
// const SERVICE_UUID = '7b183224-9168-443e-a927-7aeea07e8105'

// const CHARACTERISTICS = Object.freeze({
// 	count: '292bd3d2-14ff-45ed-9343-55d125edb721',
// 	rw: '56cd7757-5f47-4dcd-a787-07d648956068',
// 	data: 'fec26ec4-6d71-4442-9f81-55bc21d658d6',
// 	data_req: '398d2a6c-b541-4160-b4b0-c59b4e27a1bb'
// })
const COMMAND_TIMEOUT = 5000
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

	throw new Error('Can not encode value for bluetooth write')
}

class ET_Device {
	constructor() {
		this.device = null;
		this.battery = 0;
		this.device_state = -1;
		this.onDisconnected = this.onDisconnected.bind(this);
	}

	onDisconnected() {
		console.log('Device is disconnected.');
	}

	requestDevice() {
		console.log('Searching for bluetooth devices...');
		let options = {
			"filters": [{
					"namePrefix": "NIST",
					"services": [SERVICE_UUID]
				},
				{
					"services": [0xfd6f]
				}
			]
		};
		return navigator.bluetooth.requestDevice(options)
			.then(device => {
				this.device = device;
				// console.log(device, this.device.gatt);
				this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
			});
	}

	connect() {
		if (!this.device) {
			return Promise.reject("Device is not connected.");
		}
		return this.device.gatt.connect();
	}

	disconnect() {
		if (!this.device) {
			return Promise.reject('Device is not connected.');
		}
		return this.device.gatt.disconnect();
	}

	readCounts() {
		return this.device.gatt.getPrimaryService("7b183224-9168-443e-a927-7aeea07e8105")
			.then(service => service.getCharacteristic("292bd3d2-14ff-45ed-9343-55d125edb721"))
			.then(characteristic => characteristic.readValue());
	}

	readBattery() {
		return this.device.gatt.getPrimaryService("7b183224-9168-443e-a927-7aeea07e8105")
			.then(service => service.getCharacteristic("battery_level"))
			.then(characteristic => characteristic.readValue());
	}

	readCmd() {
		return this.device.gatt.getPrimaryService("7b183224-9168-443e-a927-7aeea07e8105")
			.then(service => service.getCharacteristic("56cd7757-5f47-4dcd-a787-07d648956068"))
			.then(characteristic => characteristic.readValue());
	}

	writeCmd(data) {
		return this.device.gatt.getPrimaryService("7b183224-9168-443e-a927-7aeea07e8105")
			.then(service => service.getCharacteristic("56cd7757-5f47-4dcd-a787-07d648956068"))
			.then(characteristic => characteristic.writeValue(data));
	}

	readData() {
		return this.device.gatt.getPrimaryService("7b183224-9168-443e-a927-7aeea07e8105")
			.then(service => service.getCharacteristic("fec26ec4-6d71-4442-9f81-55bc21d658d6"))
			.then(characteristic => characteristic.readValue());
	}

	writeData(data) {
		return this.device.gatt.getPrimaryService("7b183224-9168-443e-a927-7aeea07e8105")
			.then(service => service.getCharacteristic("fec26ec4-6d71-4442-9f81-55bc21d658d6"))
			.then(characteristic => characteristic.writeValue(data));
	}

	startDataNotifications(listener) {
		return this.device.gatt.getPrimaryService("7b183224-9168-443e-a927-7aeea07e8105")
			.then(service => service.getCharacteristic("fec26ec4-6d71-4442-9f81-55bc21d658d6"))
			.then(characteristic => characteristic.startNotifications())
			.then(characteristic => characteristic.addEventListener('characteristicvaluechanged', listener));
	}

	stopDataNotifications(listener) {
		return this.device.gatt.getPrimaryService("7b183224-9168-443e-a927-7aeea07e8105")
			.then(service => service.getCharacteristic("fec26ec4-6d71-4442-9f81-55bc21d658d6"))
			.then(characteristic => characteristic.stopNotifications())
			.then(characteristic => characteristic.removeEventListener('characteristicvaluechanged', listener));
	}
	write(args) {
		return this.device.gatt.getPrimaryService(args['serviceUUID'])
			.then(service => service.getCharacteristic(args['characteristicUUID']))
			.then(characteristic => characteristic.wrteValue(args['value']));

	}
	sendCommand(name) {
		// adapted  from nativescrip app  https://github.com/CTG-Boulder/nsbt-test
		// app/plugins/dongle-control.js
		const command = COMMANDS[name]

		if (!command) {
			return Promise.reject(new Error('No command named: ' + name))
		}

		return new Promise((resolve, reject) => {
			assertConnection()

			let timeout = setTimeout(() => {
				notifyCallback = noop
				reject(new Error('Command timed out before receiving response via notify'))
			}, COMMAND_TIMEOUT)

			function done(res) {
				clearTimeout(timeout)
				notifyCallback = noop

				try {
					let data = res && res.value ?
						new command.returnType(res.value) : []
					resolve(data)
				} catch (err) {
					reject(err)
				}
			}

			if (command.notify) {
				notifyCallback = done
			}

			// bluetooth.write({
			// 	peripheralUUID: connection.UUID,
			this.write({
				serviceUUID: SERVICE_UUID,
				characteristicUUID: CHARACTERISTICS.rw,
				value: toBtValue(command.value)
			}).then(res => {
				if (!command.notify) {
					done(res)
				}
			}).catch(err => {
				notifyCallback = noop
				reject(err)
			})

		})
	}


}