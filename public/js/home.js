const printBox = document.getElementById('printBox');
const userBtns = document.getElementsByClassName('userBtn');
const videoFlag = document.getElementById("videoFlag");
const videoBox = document.getElementById("videoBox");
const subscribeFlag = document.getElementById('subscribeFlag');

// var janusUrl = 'ws://106.240.247.43:8188';
var janusUrl = 'ws://106.240.247.43:3561';
// var janusUrl = 'ws://13.209.65.193:7011';
// var janusSecret = '19dc9bf617df828f1da469c843c93d327ac36bf1';
var session_id;
var publish_id;
var subscriber_ids = {};
var subscriberTransaction = {};
var subscriberFeedId = {};
var feedIdToId = {};
var order;
var res;
let janusStreams = {};
let janusStreamPeers = {};
let feedId;
let userId;
let people = {};

let two = [1280, 720, 1382000];
let four = [960, 540, 518000];
let nine = [640, 360, 230000];
let sixteen = [480, 270, 129000];
let twentyfive = [240, 135, 64000];

let mediaConstraint = {
    video: {
        width:{min: two[0], ideal: two[0]}, 
        height:{min: two[1], ideal: two[1]}
    }, 
    audio: true, 
    frameRate: { 
        ideal: 10, 
        max: 10 
    } 
};

let bitrate = two[2];

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
	// let trx = transaction[messageObj.transaction];
	// let res;

	switch(messageObj.janus){
		case 'success':
				switch(order){
					case 'create':
						session_id = messageObj.data.id;
						janus.attachPlugin(ws,userId,session_id,'janus.plugin.videoroom', true);
						break;
					case 'attachPublisher':
						publish_id = messageObj.data.id;
						if(userId == 'a1'){
							janus.destroyRoom(ws);
						} else {
							janus.joinVideoRoom(ws,35610863)
						}
						break;
					case 'attachSubscriber':
						let tempId = subscriberTransaction[messageObj.transaction];
						subscriber_ids[tempId] = messageObj.data.id;
						setTimeout(()=>{
							janus.joinSubscriber(ws, 35610863, tempId, subscriberFeedId[tempId]);
						}, 1000);
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
				if(messageObj.plugindata.data.videoroom == 'joined'){
					feedId = messageObj.plugindata.data.id;
					let publishers = messageObj.plugindata.data.publishers;
					
					publishers.forEach(element => {
						subscriberFeedId[element.display] = element.id;
						feedIdToId[element.id] = element.display;
						if(subscribeFlag.checked){
							janus.attachPlugin(ws,element.display,session_id,'janus.plugin.videoroom', false);
						} else {
							plusOne2(element.id);
						}
						// createVideoBox(element.display);
						// createSDPAnswer(element.display);
						
					})
					setTimeout(()=>{
						createVideoBox(userId);
						createSDPOffer(userId);
					},3000)
				}
				if(messageObj.plugindata.data.configured == 'ok'){
					if(messageObj.jsep)
						janusStreamPeers[userId].setRemoteDescription(messageObj.jsep);
					else {

					}
				}
				
				if(messageObj.jsep && messageObj.jsep.type === 'offer'){
					createVideoBox(messageObj.plugindata.data.display);
					createSDPAnswer(messageObj);
				}

				if(messageObj.plugindata.data.videoroom != 'joined' && messageObj.plugindata.data.publishers && messageObj.plugindata.data.publishers.length > 0){
					subscriberFeedId[messageObj.plugindata.data.publishers[0].display] = messageObj.plugindata.data.publishers[0].id;
					feedIdToId[messageObj.plugindata.data.publishers[0].id] = messageObj.plugindata.data.publishers[0].display;
					
					if(subscribeFlag.checked){
						janus.attachPlugin(ws, messageObj.plugindata.data.publishers[0].display, session_id, 'janus.plugin.videoroom', false );
					} else {
						plusOne2(messageObj.plugindata.data.publishers[0].id);
						console.log(`${messageObj.plugindata.data.publishers[0].id} joined, total : ${Object.keys(people).length}`)
					}
				}
				
				if(messageObj.plugindata.data.leaving){
					let tempId = feedIdToId[messageObj.plugindata.data.leaving];
					document.getElementById(`${tempId}`).remove();

					janusStreams[tempId].getVideoTracks()[0].stop();
					janusStreams[tempId].getAudioTracks()[0].stop();
					janusStreams[tempId] = null;
					delete janusStreams[tempId];

					janusStreamPeers[tempId].close();
					janusStreamPeers[tempId] = null;
					delete janusStreamPeers[tempId];

					minusOne(tempId);
				}
				
			}
			break;
		default:
			break;
	}
}

const plusOne = (id) => {
	people[id] = true;
	let nop = Object.keys(people).length;
	if(nop == 2){
		mediaConstraint = {
			video: {
				width:{min: two[0], ideal: two[0]}, 
				height:{min: two[1], ideal: two[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 15, 
				max: 15
			} 
		};
		bitrate = two[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(50%, auto))";
		changeConfig();
	} else if(nop == 3){
		mediaConstraint = {
			video: {
				width:{min: four[0], ideal: four[0]}, 
				height:{min: four[1], ideal: four[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		};
		bitrate = four[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(50%, auto))";
		changeConfig();
	} else if (nop == 5) {
		mediaConstraint = {
			video: {
				width:{min: nine[0], ideal: nine[0]}, 
				height:{min: nine[1], ideal: nine[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		}
		bitrate = nine[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(30%, auto))";
		changeConfig();
	} else if (nop == 10) {
		mediaConstraint = {
			video: {
				width:{min: sixteen[0], ideal: sixteen[0]}, 
				height:{min: sixteen[1], ideal: sixteen[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		};
		bitrate = sixteen[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(25%, auto))";
		changeConfig();
	} else if (nop == 17) {
		mediaConstraint = {
			video: {
				width:{min: twentyfive[0], ideal: twentyfive[0]}, 
				height:{min: twentyfive[1], ideal: twentyfive[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		}
		bitrate = twentyfive[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(20%, auto))";
		changeConfig();
	} 
}

const plusOne2 = (id) => {
	people[id] = true;
	let nop = Object.keys(people).length;
	if(nop <= 2){
		mediaConstraint = {
			video: {
				width:{min: two[0], ideal: two[0]}, 
				height:{min: two[1], ideal: two[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 15, 
				max: 15
			} 
		};
		bitrate = two[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(50%, auto))";
		changeConfig();
	} else if(nop <= 4){
		mediaConstraint = {
			video: {
				width:{min: four[0], ideal: four[0]}, 
				height:{min: four[1], ideal: four[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		};
		bitrate = four[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(50%, auto))";
		changeConfig();
	} else if (nop <= 9) {
		mediaConstraint = {
			video: {
				width:{min: nine[0], ideal: nine[0]}, 
				height:{min: nine[1], ideal: nine[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		}
		bitrate = nine[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(30%, auto))";
		changeConfig();
	} else if (nop <= 16) {
		mediaConstraint = {
			video: {
				width:{min: sixteen[0], ideal: sixteen[0]}, 
				height:{min: sixteen[1], ideal: sixteen[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		};
		bitrate = sixteen[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(25%, auto))";
		changeConfig();
	} else if (nop <= 25) {
		mediaConstraint = {
			video: {
				width:{min: twentyfive[0], ideal: twentyfive[0]}, 
				height:{min: twentyfive[1], ideal: twentyfive[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		}
		bitrate = twentyfive[2];
		document.getElementById('videoBox').style.gridTemplateColumns = "repeat(auto-fill, minmax(20%, auto))";
		changeConfig();
	} 
}

const minusOne = (id) => {
	delete people[id];
	let nop = Object.keys(people).length;
	if(nop == 2){
		mediaConstraint = {
			video: {
				width:{min: two[0], ideal: two[0]}, 
				height:{min: two[1], ideal: two[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 15, 
				max: 15 
			} 
		};
		bitrate = two[2];
		changeConfig();
	} else if (nop == 4) {
		mediaConstraint = {
			video: {
				width:{min: four[0], ideal: four[0]}, 
				height:{min: four[1], ideal: four[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		}
		bitrate = four[2];
		changeConfig();
	} else if (nop == 9) {
		mediaConstraint = {
			video: {
				width:{min: nine[0], ideal: nine[0]}, 
				height:{min: nine[1], ideal: nine[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		};
		bitrate = nine[2];
		changeConfig();
	} else if (nop == 16) {
		mediaConstraint = {
			video: {
				width:{min: sixteen[0], ideal: sixteen[0]}, 
				height:{min: sixteen[1], ideal: sixteen[1]}
			}, 
			audio: true, 
			frameRate: { 
				ideal: 10, 
				max: 10 
			} 
		}
		bitrate = sixteen[2];
		changeConfig();
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
	
	plusOne(userId);
	
}

const createSDPOffer = async userId => {
	janusStreams[userId] = await navigator.mediaDevices.getUserMedia(mediaConstraint);
	
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

const changeConfig = () => {
	
	navigator.mediaDevices.getUserMedia(mediaConstraint).then(stream => {
		let videoTrack = stream.getVideoTracks()[0];
		var sender = janusStreamPeers[userId].getSenders().find(s => {
			return s.track.kind == videoTrack.kind;
		});
		sender.replaceTrack(videoTrack);
		janusStreams[userId] = stream;
		console.log(`${userId} ::: ${JSON.stringify(mediaConstraint.video)}`)
	}).catch(err => {
		console.log('Error ::: ', err);
	});
}


///////// janus plugin 관련 method /////////


janus.createSession = ws => {
	let trxid = getTrxID();
	order = 'create';
	let msg = {
		janus: order,
		transaction: trxid
	};

	socketLog('send', msg);
	ws.send(JSON.stringify(msg));

	return trxid;
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
janus.attachPlugin = (ws, opaqueId, session_id, plugin_name, isPublisher) => {
	let trxid = getTrxID();
	if(isPublisher){
		order = 'attachPublisher';
	} else {
		order = 'attachSubscriber';
		subscriberTransaction[trxid] = opaqueId;
	}
	let msg = {
		janus: 'attach',
		transaction: trxid,
		opaqueId: opaqueId,
		session_id : session_id,
		plugin : plugin_name
	};

	socketLog('send', msg);
	ws.send(JSON.stringify(msg));

	return trxid;
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
			publishers: 100
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
			video: true,
			// bitrate: bitrate
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
			display: userId,
			// bitrate
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

janus.editRoom = (ws, bit) => {
	let trxid = getTrxID();
	let msg = {
		janus: 'message',
		session_id: session_id,
		handle_id: publish_id,
		transaction: trxid,
		body : {
			request: 'edit',
			room: 35610863,
			new_bitrate: bit
		}
	};

	socketLog('send', msg);
	ws.send(JSON.stringify(msg));
}

///////// 버튼 이벤트 관련 method /////////
for(i=0;i<userBtns.length;++i){
    const temp = userBtns[i].value;
    userBtns[i].addEventListener('click', () => {
		userId = temp;
		janus.createSession(ws);
		document.getElementById('user').style.display = 'none'
    })
}
