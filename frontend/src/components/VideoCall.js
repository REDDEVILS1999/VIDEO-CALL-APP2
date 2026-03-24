import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import '../styles/VideoCall.css';

const SOCKET_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const VideoCall = ({ token, onClose }) => {
  const [roomId, setRoomId] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle | waiting | connected
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    socketRef.current?.disconnect();
    localStreamRef.current = null;
    pcRef.current = null;
    socketRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const createPeerConnection = useCallback((targetId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socketRef.current?.emit('ice-candidate', { target: targetId, candidate });
      }
    };

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = streams[0];
      setCallStatus('connected');
    };

    pc.oniceconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setCallStatus('waiting');
      }
    };

    localStreamRef.current?.getTracks().forEach(track =>
      pc.addTrack(track, localStreamRef.current)
    );

    return pc;
  }, []);

  const joinRoom = async () => {
    const trimmedRoom = roomId.trim();
    if (!trimmedRoom) return;
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socketRef.current = io(SOCKET_URL, { auth: { token } });

      socketRef.current.on('connect_error', () => {
        setError('Could not connect to server.');
        cleanup();
        setInRoom(false);
      });

      socketRef.current.on('waiting', () => setCallStatus('waiting'));

      socketRef.current.on('room-full', () => {
        setError('Room is full. Try a different room ID.');
        cleanup();
        setInRoom(false);
      });

      // First user in room notified that second user joined — first user creates offer
      socketRef.current.on('user-joined', async ({ socketId }) => {
        pcRef.current = createPeerConnection(socketId);
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socketRef.current.emit('offer', { target: socketId, offer });
      });

      // Second user receives offer, sends answer
      socketRef.current.on('offer', async ({ from, offer }) => {
        pcRef.current = createPeerConnection(from);
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketRef.current.emit('answer', { target: from, answer });
      });

      socketRef.current.on('answer', async ({ answer }) => {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socketRef.current.on('ice-candidate', async ({ candidate }) => {
        try {
          await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('ICE candidate error:', e);
        }
      });

      socketRef.current.on('user-left', () => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        pcRef.current?.close();
        pcRef.current = null;
        setCallStatus('waiting');
      });

      socketRef.current.emit('join-room', trimmedRoom);
      setInRoom(true);
    } catch (err) {
      setError('Camera/microphone access denied. Please allow permissions and try again.');
      cleanup();
    }
  };

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave-room');
    cleanup();
    setInRoom(false);
    setCallStatus('idle');
    setIsMuted(false);
    setIsVideoOff(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, [cleanup]);

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(v => !v);
  };

  return (
    <div className="vc-overlay">
      <div className="vc-modal">
        <div className="vc-header">
          <span className="vc-title">Video Call</span>
          <button className="vc-close" onClick={() => { leaveRoom(); onClose(); }}>✕</button>
        </div>

        {!inRoom ? (
          <div className="vc-join">
            <p className="vc-hint">Share a room ID with someone to start a call.</p>
            {error && <div className="vc-error">{error}</div>}
            <div className="vc-input-row">
              <input
                className="vc-input"
                type="text"
                placeholder="Enter room ID…"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinRoom()}
              />
              <button className="vc-btn-join" onClick={joinRoom} disabled={!roomId.trim()}>
                Join
              </button>
            </div>
          </div>
        ) : (
          <div className="vc-call-area">
            <div className={`vc-status vc-status--${callStatus}`}>
              {callStatus === 'waiting' && 'Waiting for peer to join…'}
              {callStatus === 'connected' && '● Connected'}
            </div>

            <div className="vc-videos">
              {/* Remote video (large) */}
              <div className="vc-remote-wrap">
                <video ref={remoteVideoRef} autoPlay playsInline className="vc-video vc-remote" />
                {callStatus !== 'connected' && (
                  <div className="vc-placeholder">
                    <div className="vc-avatar">👤</div>
                    <p>Waiting for peer…</p>
                  </div>
                )}
              </div>

              {/* Local video (picture-in-picture) */}
              <div className="vc-local-wrap">
                <video ref={localVideoRef} autoPlay playsInline muted className="vc-video vc-local" />
                <span className="vc-you-label">You</span>
              </div>
            </div>

            <div className="vc-controls">
              <button
                className={`vc-ctrl${isMuted ? ' vc-ctrl--active' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
                )}
              </button>

              <button className="vc-ctrl vc-ctrl--end" onClick={leaveRoom} title="End call">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>

              <button
                className={`vc-ctrl${isVideoOff ? ' vc-ctrl--active' : ''}`}
                onClick={toggleVideo}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isVideoOff ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10M1 1l22 22"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                )}
              </button>
            </div>

            <div className="vc-room-tag">Room: <strong>{roomId}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
