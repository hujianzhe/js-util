const { NetConst, NetChannel, NetPipelineBase } = require('./net_channel_base.js');
const net = require('net');
require('../common/list.js');
require('../common/promise.js');

let data_list = new js_util.Common.List();
let resolve_wait = new js_util.Common.ResolveWait(() => {
	return data_list.length <= 0;
});
(async () => {
	while (true) {
		await resolve_wait.wait();
		const node = data_list.pop_front();
		console.log(node.value);
	}
})();

const pipeline = new NetPipelineBase();
pipeline.fnReadBuffer = (channel, buff, rinfo) => {
	data_list.push_back(buff.toString());
	resolve_wait.wake();
	return buff.length;
};

pipeline.fnHandleClose = (channel, err) => {
	console.log(`channel detached, ${err}`);
};

(async() => {
	net.createServer((socket) => {
		ch = new NetChannel(NetChannel.SERVER_SIDE, pipeline, socket, NetConst.SOCK_STREAM);
	}).listen(45678);
})();

(async() => {
	let ch = new NetChannel(NetChannel.CLIENT_SIDE, pipeline, null, NetConst.SOCK_STREAM);
	ch.connect("127.0.0.1", 45678);
	for (let i = 0; i < 10; ++i) {
		ch.send(Buffer.from(`test message ${i} ~~~\n`));
	}
	ch.fin();
})();