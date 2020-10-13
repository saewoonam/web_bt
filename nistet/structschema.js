const PRIMITIVES = {
	'uint8': {
		getter: (dataview, prop, byteOffset) => dataview.getUint8(byteOffset, prop.littleEndian),
		byteSize: 1
	},
	'uint16': {
		getter: (dataview, prop, byteOffset) => dataview.getUint16(byteOffset, prop.littleEndian),
		byteSize: 2
	},
	'uint32': {
		getter: (dataview, prop, byteOffset) => dataview.getUint32(byteOffset, prop.littleEndian),
		byteSize: 4
	},
	'int8': {
		getter: (dataview, prop, byteOffset) => dataview.getInt8(byteOffset, prop.littleEndian),
		byteSize: 1
	},
	'int16': {
		getter: (dataview, prop, byteOffset) => dataview.getInt16(byteOffset, prop.littleEndian),
		byteSize: 2
	},
	'int32': {
		getter: (dataview, prop, byteOffset) => dataview.getInt32(byteOffset, prop.littleEndian),
		byteSize: 4
	},
	'float32': {
		getter: (dataview, prop, byteOffset) => dataview.getFloat32(byteOffset, prop.littleEndian),
		byteSize: 4
	},
	'float64': {
		getter: (dataview, prop, byteOffset) => dataview.getFloat64(byteOffset, prop.littleEndian),
		byteSize: 8
	}
}

function data2hex(uint8array) {
	// https://stackoverflow.com/questions/40031688/javascript-arraybuffer-to-hex
	return Array.prototype.map.call(uint8array, x => ('00' + x.toString(16)).slice(-2)).join('');
}

class StructSchema {
	constructor(schema) {
		this._totalBytes = 0
		this._props = []

		for (let entry of schema) {
			this.addProp(entry)
		}
	}

	addProp(entry) {
		let {
			key,
			type,
			length = 1,
			littleEndian = false
		} = entry

		if (this._props.some(e => e.key === key)) {
			throw new Error(`Property with key name "${key}" already defined`)
		}

		let byteOffset = this._totalBytes
		let def
		if (type instanceof StructSchema) {
			def = {
				getter: (view, prop, byteOffset) => type.read(new DataView(view.buffer, view.byteOffset + byteOffset, prop.byteSize)),
				byteSize: type._totalBytes
			}
		} else {
			def = PRIMITIVES[type]
		}

		if (!def) {
			throw new Error(`Type "${type}" not valid.`)
		}

		let {
			getter,
			byteSize
		} = def

		let totalBytes = byteSize * length
		let prop = Object.freeze({
			key,
			type,
			length,
			littleEndian,
			byteSize: byteSize,
			totalBytes: totalBytes,
			read(view) {
				let data = []
				for (let i = 0; i < length; i++) {
					data[i] = getter(view, prop, byteOffset + byteSize * i)
				}
				return data
			}
		})
		this._totalBytes += totalBytes
		this._props.push(prop)
	}
	read(bufferOrView) {
		let ret = {}
		let view = bufferOrView
		if (!(bufferOrView instanceof DataView)) {
			view = new DataView(bufferOrView)
		}
		for (let prop of this._props) {
			let data = prop.read(view)
			if (prop.length === 1) {
				data = data[0]
			}
			ret[prop.key] = data
		}
		return ret
	}
}

const BLOCK_SIZE = 32 // bytes

const uSound = new StructSchema([{
		key: 'n',
		type: 'uint8',
		littleEndian: true
	},
	{
		key: 'left',
		type: 'uint16',
		littleEndian: true
	},
	{
		key: 'left_iqr',
		type: 'uint16',
		littleEndian: true
	},
	{
		key: 'right',
		type: 'uint16',
		littleEndian: true
	},
	{
		key: 'right_iqr',
		type: 'uint16',
		littleEndian: true
	},
])

const encounterRecord = new StructSchema([{
		key: 'minute',
		type: 'uint32',
		length: 1,
		littleEndian: true
	},
	{
		key: 'mac',
		type: 'uint8',
		length: 6,
		littleEndian: true
	},
	{
		key: 'version',
		type: 'uint8',
		length: 1,
		littleEndian: true
	},
	{
		key: 'usound_data',
		type: uSound,
		length: 1,
		littleEndian: true
	},
	{
		key: 'rssi_values',
		type: 'int8',
		length: 12
	},
	{
		key: 'public_key',
		type: 'uint8',
		length: 32,
		littleEndian: true
	}
])

function getDataFromView(arrayView) {
	let parsed = encounterRecord.read(arrayView)

	let tz_offset_ms = new Date().getTimezoneOffset() * 60 * 1000;
	let d = new Date(parsed.minute * 60 * 1000 - tz_offset_ms) // 3600 * 6 * 1000)
	let timestamp = d.toISOString()
	timestamp = timestamp.split('.')
	timestamp = timestamp[0]

	let encounterId = data2hex(parsed.public_key)

	return {
		...parsed,
		timestamp,
		encounterId
	}
}