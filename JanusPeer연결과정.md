## VideoRoom 에 publisher로 join

1. session 연결

   [ # -> Janus ]
   {"janus":"create","transaction":"auGtQhm6gFK7"}

   [ Janus -> # ]
   {"janus":"success","transaction":"auGtQhm6gFK7","data":{"id":1868893433966883}}

2. attach plugin

   [ # -> Janus ]
   {"janus":"attach","plugin":"janus.plugin.videoroom","opaque_id":"videoroomtest-XKsJoSjbRpod","transaction":"H0y2E97uuBQB","session_id":1868893433966883}

   [ Janus -> # ]
   {"janus":"success","session_id":1868893433966883,"transaction":"H0y2E97uuBQB","data":{"id":62376720748336}}

3. room create

   [ # -> Janus ]
   {"janus":"message","session_id":2893486532907045,"handle_id":210254612177858,"body":{"request":"create","publishers":10,"room":715044234804,"bitrate":3000000},"transaction":"FW0pTrhZMVRb"}

   [ Janus -> # ]
   {"janus":"success","session_id":2893486532907045,"transaction":"FW0pTrhZMVRb","sender":210254612177858,"plugindata":{"plugin":"janus.plugin.videoroom","data":{"videoroom":"created","room":715044234804,"permanent":false}}}

4. room join (as publisher)

   [ # -> Janus ]
   {"janus":"message","body":{"request":"join","room":1234,"ptype":"publisher","display":"firstOne"},"transaction":"K9hf6AgLANNm","session_id":1868893433966883,"handle_id":62376720748336}

   [ Janus -> # ]
   {"janus":"event","session_id":1868893433966883,"transaction":"K9hf6AgLANNm","sender":62376720748336,"plugindata":{"plugin":"janus.plugin.videoroom","data":{"videoroom":"joined","room":1234,"description":"Demo Room","id":3681820735790219,"private_id":1879592971,"publishers":[]}}}

5. sdp 교환

   [ # -> Janus ]
   {"janus":"message","body":{"request":"configure","audio":true,"video":true},"transaction":"VxUVOyLW2div","jsep":{"type":"offer","sdp":"sdp info"},"session_id":1868893433966883,"handle_id":62376720748336}

   [ Janus -> # ]
   {"janus":"event","session_id":1868893433966883,"transaction":"VxUVOyLW2div","sender":62376720748336,"plugindata":{"plugin":"janus.plugin.videoroom","data":{"videoroom":"event","room":1234,"configured":"ok","audio_codec":"opus","video_codec":"vp8"}},"jsep":{"type":"answer","sdp":"sdp info"}}

6. Peer 연결 완료

   [ Janus -> # ]
   {"janus":"webrtcup","session_id":1868893433966883,"sender":62376720748336}

## VideoRoom 에 subscriber로 join

1. attach plugin

   [ # -> Janus ]
    {"janus":"attach","plugin":"janus.plugin.videoroom","opaque_id":"videoroomtest-tJmUc6pTwNkx","transaction":"fbDYVYUmvbZ6","session_id":4763320713030831}

   [ Janus -> # ]
    {"janus":"success","session_id":4763320713030831,"transaction":"fbDYVYUmvbZ6","data":{"id":2073952968283825}}

2. room join (as subscriber) & sdp 교환

   [ # -> Janus ]
    {"janus":"message","session_id":7837145198065455,"handle_id":7841159812123782,"transaction":"UGPXpkiDYJOg","body":{"request":"join","ptype":"subscriber","room":7779367676307354,"display":"test","feed":8446519357394763}}

   [ Janus -> # ]
    {"janus":"event","session_id":7837145198065455,"transaction":"UGPXpkiDYJOg","sender":7841159812123782,"plugindata":{"plugin":"janus.plugin.videoroom","data":{"videoroom":"attached","room":7779367676307354,"id":8446519357394763,"display":"test"}},"jsep":{"type":"offer","sdp":"sdp info ..."}}

    [ # -> Janus ]
    {"janus":"message","transaction":"LFyYvvwgWuHY","handle_id":7841159812123782,"session_id":7837145198065455,"body":{"request":"start","room":7779367676307354,"video":true,"audio":false},"jsep":{"type":"answer","sdp":"sdp info ..."}}

    [ Janus -> # ]
    "janus":"event","session_id":7837145198065455,"transaction":"LFyYvvwgWuHY","sender":7841159812123782,"plugindata":{"plugin":"janus.plugin.videoroom","data":{"videoroom":"event","room":7779367676307354,"started":"ok"}}}

5. Peer 연결 완료

    [ Janus -> # ]
    {"janus":"webrtcup","session_id":7837145198065455,"sender":7841159812123782}

