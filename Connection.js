const WebClient = {
	Connection : function(ip, port, onMessage, onDisconnect, onOpen, onFailConnect){
		this.onMessage = onMessage;
		this.onOpen = onOpen;
		this.isOpen = function(){
			return this.queue === null && !this.closed;
		}
		this.closed = false;
		this.sendBytes = function(array){
			if(this.queue == null)
				this.socket.send(array.buffer);
			else
				this.queue.push(array.buffer);
		};
		this.send = function(array){
			let stringLength = Math.floor(array.length / 2);
			if(stringLength * 2 != array.length)
				stringLength++;
			const array16 = new Uint16Array(stringLength);
			for(let index = 0; index < stringLength - 1; index++){
				array16[index] = 256 * array[index * 2] + array[index * 2 + 1];
			}
			if(this.queue == null)
				this.socket.send(String.fromCharCode.apply(String, array16));
			else
				this.queue.push(String.fromCharCode.apply(String, array16));
		};
		this.createOutput = function(){
			const thisClient = this;
			return new BitHelper.ByteArrayBitOutput(undefined, undefined, function(){
				const arrayToSend = new Int8Array(this.boolIndex === 0 ? this.index : this.index + 1);
				javaArrayCopy(this.array, 0, arrayToSend, 0, arrayToSend.length);
				thisClient.sendBytes(arrayToSend);
			});
		};
		this.close = function(){
			this.socket.close();
		};
		
		let socketOnopen = function(event){
			for(let index = 0; index < this.queue.length; index++){
				this.socket.send(this.queue[index]);
			}
			this.queue = null;
			if(this.onOpen){
				this.onOpen(event);
			}
		};
		socketOnopen = socketOnopen.bind(this);
		
		let socketOnmessage = function(event){
			const fileReader = new FileReader();
			const thisConnection = this;
			fileReader.onload = function(event2) {
				thisConnection.onMessage(new BitHelper.ByteArrayBitInput(new Int8Array(event2.target.result)));
			};
			fileReader.readAsArrayBuffer(event.data);
		};
		socketOnmessage = socketOnmessage.bind(this);
		
		let socketOnDisconnect = function(event){
			if(this.isOpen()){
				onDisconnect(event);
			}
			else if(onFailConnect){
				onFailConnect(event);
			}
			this.closed = true;
		};
		socketOnDisconnect = socketOnDisconnect.bind(this);
		
		this.queue = [];
		
		this.socket = new WebSocket('ws://' + ip + ':' + port);
		console.log('Created socket');
		this.socket.onclose = socketOnDisconnect;
		//this.socket.onerror = socketOnDisconnect;
		this.socket.onopen = socketOnopen;
		this.socket.onmessage = socketOnmessage;
	}
};