class NISTET {

  constructor() {
    this.device = null;
    this.onDisconnected = this.onDisconnected.bind(this);
  }
  
  request() {
    let options = {
      "filters": [{
        "namePrefix": "NIST",
        "services": ["7b183224-9168-443e-a927-7aeea07e8105"]
      }]
    };
    return navigator.bluetooth.requestDevice(options)
    .then(device => {
      this.device = device;
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
    });
  }
  
  connect() {
    if (!this.device) {
      return Promise.reject('Device is not connected.');
    }
    return this.device.gatt.connect();
  }
  
  readCounts() {
    return this.device.gatt.getPrimaryService("7b183224-9168-443e-a927-7aeea07e8105")
    .then(service => service.getCharacteristic("292bd3d2-14ff-45ed-9343-55d125edb721"))
    .then(characteristic => characteristic.readValue());
  }

  disconnect() {
    if (!this.device) {
      return Promise.reject('Device is not connected.');
    }
    return this.device.gatt.disconnect();
  }

  onDisconnected() {
    console.log('Device is disconnected.');
  }
}

var nISTET = new NISTET();

document.querySelector('button').addEventListener('click', event => {
  nISTET.request()
  .then(_ => nISTET.connect())
  .then(_ => { /* Do something with nISTET... */})
  .catch(error => { console.log(error) });
});