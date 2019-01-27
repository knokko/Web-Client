const WebClient = {
	Connection : function(ip, port, onMessage, onDisconnect, onOpen, onFailConnect){
		this.onMessage = onMessage;
		this.onOpen = onOpen;
		this.onDisconnect = onDisconnect;
		this.onFailConnect = onFailConnect;
		this.closed = false;
		this.encryptor = null;
		this.decryptor = null;
		this.binaryQueue = [];
		this.socket = new WebSocket('ws://' + ip + ':' + port);
		this.socket.onclose = this.socketOnDisconnect.bind(this);
		this.socket.onopen = this.socketOnopen.bind(this);
		this.socket.onmessage = this.socketOnmessage.bind(this);
	}
};

WebClient.Connection.prototype.setEncryptor = function(encryptor){
	this.encryptor = encryptor;
};

WebClient.Connection.prototype.setDecryptor = function(decryptor){
	this.decryptor = decryptor;
};

WebClient.Connection.prototype.sendBytes = function(array){
	if(this.binaryQueue == null)
		this.sendBytesNow(array);
	else
		this.binaryQueue.push(array);
};

WebClient.Connection.prototype.sendBytesNow = function(array){
	this.socket.send(array.buffer);
};

WebClient.Connection.prototype.isOpen = function(){
	return this.binaryQueue === null && !this.closed;
};

WebClient.Connection.prototype.close = function(){
	this.socket.close();
};

WebClient.Connection.prototype.createOutput = function(initialCapacity){
	const thisClient = this;
	return new BitHelper.ByteArrayBitOutput(new Int8Array(initialCapacity || 100), 0, function(){
		let bytes = this.getBytes();
		if (thisClient.encryptor !== null){
			bytes = thisClient.encryptor.encrypt(bytes);
		}
		thisClient.sendBytes(bytes);
	});
};

WebClient.Connection.prototype.socketOnopen = function(event){
	for(let index = 0; index < this.binaryQueue.length; index++){
		this.sendBytesNow(this.binaryQueue[index]);
	}
	this.binaryQueue = null;
	if(this.onOpen){
		this.onOpen(event);
	}
};

WebClient.Connection.prototype.socketOnmessage = function(event){
	const fileReader = new FileReader();
	const thisConnection = this;
	fileReader.onload = function(event2) {
		let bytes = new Int8Array(event2.target.result);
		if (thisConnection.decryptor !== null){
			bytes = thisConnection.decryptor.decrypt(bytes);
		}
		thisConnection.onMessage(new BitHelper.ByteArrayBitInput(bytes));
	};
	fileReader.readAsArrayBuffer(event.data);
};

WebClient.Connection.prototype.socketOnDisconnect = function(event){
	if(this.isOpen()){
		this.onDisconnect(event);
	}
	else if(onFailConnect){
		this.onFailConnect(event);
	}
	this.closed = true;
};