const printBox = document.getElementById('printBox');
const userBtns = document.getElementsByClassName('userBtn');
const videoFlag = document.getElementById("videoFlag");

var janusUrl = 'ws://106.240.247.43:8188';
// var janusSecret = '19dc9bf617df828f1da469c843c93d327ac36bf1';
var session_id;
var publish_id;
var subscriber_ids = {};
var subscriberTransaction = {};
var subscriberFeedId = {};
var res;
let janusStreams = {};
let janusStreamPeers = {};
let feedId;
let userId;
var transaction = {};


var ws = new WebSocket(janusUrl, 'janus-protocol');

const janus = {};

//session이 create 한 후 매 45초 마다 실행
setInterval(() => {
	if(session_id){
		janus.sendKeepAlive(ws,session_id);
	}
},45000);


///////// Web Socket 관련 method /////////
ws.onopen = () => {
	socketLog("info", `WebSocket ${janusUrl} has connected!`);
	console.log(`WebSocket ${janusUrl} has connected!`);
}

ws.onerror = error => {
	console.log(`WebSocket error : `,error);
}

ws.onmessage = e => {
	getMessage(e.data);
}

ws.onclose = () => {
	console.log(`WebSocket has closed `);
}

///////// 기타 method /////////

//로그 출력 
const socketLog = (type, contents) => {
	let contentsJson = JSON.stringify(contents);
	let textLine = document.createElement("p");
	let textContents = document.createTextNode(`[${type}] ${contentsJson}`);
	textLine.appendChild(textContents);
	printBox.appendChild(textLine);
}

//transaction 값을 랜덤으로 생성
const getTrxID = () => {
	var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var randomString = '';
	for(var i=0;i<12;i++){
		var randomPoz = Math.floor(Math.random()*charSet.length);
		randomString += charSet.substring(randomPoz, randomPoz+1);
	}
	return randomString;
}

const getMessage = (message) => {
	let messageObj = JSON.parse(message)
	if(messageObj.janus !== 'ack')
		socketLog('receive', JSON.parse(message));
	let trx = transaction[messageObj.transaction];
	trx.onsuccess(messageObj);

	switch(messageObj.janus){
		case 'success':
				switch(trx.order){
					case 'create':
						break;
					case 'attach':
						if(userId == 'a1'){
							janus.destroyRoom(ws);
						} else {
							janus.joinVideoRoom(ws,35610863)
						}
						break;
					case 'attachSubscriber':
						break;
					case 'createVideoRoom':
						janus.joinVideoRoom(ws,35610863)
						break;
					case 'joinVideoRoom':
						break;
					case 'createOffer':
						break;
					case 'destroyVideoRoom':
						janus.createVideoRoom(ws)
						break;
					default:
						break;
				}
			break;
		case 'event':
			{
				
				
			}
			break;
		default:
			break;
	}
}

const createVideoBox = userId => {
    let videoContainner = document.createElement("div");
    videoContainner.classList = "multi-video";
    videoContainner.id = userId;

    let videoLabel = document.createElement("p");
    let videoLabelText = document.createTextNode(userId);
    videoLabel.appendChild(videoLabelText);
    
    let videoResolution = document.createElement("p");
    videoResolution.id = `resolutions-${userId}`;
    videoResolution.innerText = 0;
    
    let videoBitrate = document.createElement("p");
    videoBitrate.id = `bitrate-${userId}`;
    videoBitrate.innerText = 0;
    
    videoContainner.appendChild(videoLabel);
    videoContainner.appendChild(videoResolution);
    videoContainner.appendChild(videoBitrate);

    let multiVideo = document.createElement("video");
    multiVideo.autoplay = true;
    multiVideo.id = "multiVideo-" + userId;
    videoContainner.appendChild(multiVideo);

    videoBox.appendChild(videoContainner);
}

const createSDPOffer = async userId => {
	janusStreams[userId] = await navigator.mediaDevices.getUserMedia({
        video: {
            width:{min: 240, ideal: 240}, 
            height:{min: 135, ideal: 135}
        }, 
        audio: true, 
        frameRate: { 
            ideal: 10, 
            max: 10 
        } 
    });
	
	if(videoFlag.checked){
		let str = 'multiVideo-'+userId;
		let multiVideo = document.getElementById(str);
		multiVideo.srcObject = janusStreams[userId];
		multiVideo.muted = true
	}
	
	janusStreamPeers[userId] = new RTCPeerConnection();
	janusStreams[userId].getTracks().forEach(track => {
		janusStreamPeers[userId].addTrack(track, janusStreams[userId]);

		var cnt = 1;
        getStats(janusStreamPeers[userId], result => {
            if(result){
                document.getElementById(`bitrate-${userId}`).innerText = Math.ceil(result.video.bytesSent*8 / cnt);
                document.getElementById(`resolutions-${userId}`).innerText = result.resolutions.send.width+"*"+result.resolutions.send.height;;
                cnt++;
            }
        }, 1000);
	});

	janusStreamPeers[userId].createOffer().then(sdp => {
		janusStreamPeers[userId].setLocalDescription(sdp);
		return sdp;
	}).then(sdp => {
		janus.createOffer(ws,sdp);
	})



}

const createSDPAnswer = async data => {
	let tempId = data.plugindata.data.display;
	janusStreamPeers[tempId] = new RTCPeerConnection();
	janusStreamPeers[tempId].ontrack = e => {
		janusStreams[tempId] = e.streams[0];
		
		if(videoFlag.checked){
			let multiVideo = document.querySelector("#multiVideo-" + tempId);
			multiVideo.srcObject = janusStreams[tempId];
		}

		var cnt = 1;
        getStats(janusStreamPeers[tempId], result => {
            if(result.video.bytesReceived !== 0){
                if(document.getElementById(`bitrate-${tempId}`) && document.getElementById(`resolutions-${tempId}`)){
                    document.getElementById(`bitrate-${tempId}`).innerText = Math.ceil(result.video.bytesReceived*8 / cnt);
                    document.getElementById(`resolutions-${tempId}`).innerText = result.resolutions.recv.width+"*"+result.resolutions.recv.height;
                }
                cnt++;
              }
        }, 1000);
	}

	await janusStreamPeers[tempId].setRemoteDescription(data.jsep);
	let answerSdp = await janusStreamPeers[tempId].createAnswer();
	await janusStreamPeers[tempId].setLocalDescription(answerSdp);
	
	janusStreamPeers[tempId].onicecandidate = e => {
		if(!e.candidate){
			let trxid = getTrxID();
			let msg = {
				janus: "message",
				transaction: trxid,
				handle_id: subscriber_ids[tempId],
				session_id: session_id,
				body: {
				request: "start",
				room: 35610863,
				video: true,
				audio: false
				},
				jsep: janusStreamPeers[tempId].localDescription
			};

			socketLog("send", msg);
			ws.send(JSON.stringify(msg));
		}
	}
}


///////// janus plugin 관련 method /////////

janus.createSession = ws => {
	return new Promise((resolve, reject)=>{
		let trxid = getTrxID();
		order = 'create';
		let msg = {
			janus: order,
			transaction: trxid
		};
	
		socketLog('send', msg);
		transaction[trxid] = {};
		transaction[trxid].onsuccess = resolve;
		transaction[trxid].order = order;
		
		ws.send(JSON.stringify(msg));
	})
}

//session을 삭제하고 session에 연결된 handle 또한 삭제한다.
janus.destroySession = (ws, session_id) => {
	let trxid = getTrxID();
	order = 'destroy';
	let msg = {
		janus: order,
		transaction: trxid,
		session_id: session_id
	}

	ws.send(JSON.stringify(msg));

	return trxid;
}

//plugin에 session을 attach 한다.
janus.attachPlugin = (ws, opaqueId, session_id) => {
	console.log("session id ::::", session_id)
	return new Promise((resolve, reject) => {
		let trxid = getTrxID();
		let order = 'attach'
		let msg = {
			janus: order,
			transaction: trxid,
			opaqueId: opaqueId,
			session_id : session_id,
			plugin : 'janus.plugin.videoroom'
		};
	
		socketLog('send', msg);
		ws.send(JSON.stringify(msg));

		transaction[trxid] = {};
		transaction[trxid].onsuccess = resolve;
		transaction[trxid].order = order;
	})
}

janus.createVideoRoom = (ws) => {
	let trxid = getTrxID();
	order = 'createVideoRoom'
	let msg = {
		janus: 'message',
		session_id: session_id,
		handle_id: publish_id,
		transaction: trxid,
		body : {
			request: 'create',
			room: 35610863,
			bitrate: 40000
		}
	};

	socketLog('send', msg);
	ws.send(JSON.stringify(msg));

	return trxid;
}

janus.joinVideoRoom = (ws, roomId) => {
	let trxid = getTrxID();
	order = 'joinVideoRoom';
	let msg = {
		janus: 'message',
		session_id: session_id,
		handle_id: publish_id,
		transaction: trxid,
		body: {
			request: 'join',
			ptype: 'publisher',
			room: parseInt(roomId),
			display: "test"
		}
	}
	
	socketLog('send', msg);
	ws.send(JSON.stringify(msg));
}

janus.joinSubscriber = (ws, roomId, displayId, feedId) => {
	let trxid = getTrxID();
	order = 'joinVideoRoom';
	let msg = {
    janus: "message",
    session_id: session_id,
    handle_id: subscriber_ids[displayId],
    transaction: trxid,
    body: {
      request: "join",
      ptype: "subscriber",
      room: parseInt(roomId),
	  display: "test",
	  close_pc: false,
      feed: feedId
    }
  };
	
	socketLog('send', msg);
	ws.send(JSON.stringify(msg));
}

janus.publish = (ws) => {
	let trxid = getTrxID();
	order = 'publish';
	let msg = {
		janus: 'message',
		session_id: session_id,
		handle_id: publish_id,
		transaction: trxid,
		body: {
			request: 'publish ',
			audio: false,
			video: true
		}
	}

	socketLog('send', msg);
	ws.send(JSON.stringify(msg));
}

janus.createOffer = (ws,sdp) => {
	let trxid = getTrxID();
	let msg = {
		janus: 'message',
		transaction: trxid,
		handle_id: publish_id,
		session_id: session_id,
		body:{
			request: 'publish',
			video: true,
			audio: false,
			display: userId
		},
		jsep: {
			type: sdp.type,
			sdp: sdp.sdp
		}
	} 

	socketLog('send', msg);
	ws.send(JSON.stringify(msg));
}

janus.sendKeepAlive = (ws) => {
	let trxid = getTrxID();
	let msg = {
		janus: 'keepalive',
		session_id : session_id,
		transaction: trxid
	} 
	// console.log(msg);
	ws.send(JSON.stringify(msg));

	return trxid;
}

janus.trickle = (candidate) => {
	let trxid = getTrxID();
	let _candidate = {
		candidate: candidate.candidate,
		sdpMid: candidate.sdpMid,
		sdpMLineIndex: candidate.sdpMLineIndex
	};

	let request = {
		janus: "trickle",
		session_id: session_id,
		handle_id: publish_id,
		candidate: _candidate,
		transaction: trxid
	};

	socketLog("send", request);
	ws.send(JSON.stringify(request));
}

janus.destroyRoom = (ws) => {
	let trxid = getTrxID();
	order = 'destroyVideoRoom'
	let msg = {
		janus: 'message',
		session_id: session_id,
		handle_id: publish_id,
		transaction: trxid,
		body : {
			request: 'destroy',
			room: 35610863
		}
	};

	socketLog('send', msg);
	ws.send(JSON.stringify(msg));
}

///////// 버튼 이벤트 관련 method /////////
for(i=0;i<userBtns.length;++i){
    const temp = userBtns[i].value;
    userBtns[i].addEventListener('click', async () => {
		userId = temp;
		let resData = await janus.createSession(ws);
		console.log("check :::", resData)
		session_id = resData.data.id;
		console.log("check :::", session_id);
		resData = await janus.attachPlugin(ws, session_id);
		console.log("check :::", resData)
    })
}