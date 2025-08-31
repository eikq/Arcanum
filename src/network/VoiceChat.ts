import { netClient } from './NetClient';
import type { PlayerID } from '../shared/net';

export class VoiceChat {
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private isMuted = false;
  private isConnected = false;

  constructor() {
    this.setupRTCEventListeners();
  }

  async init(remoteAudioElement: HTMLAudioElement): Promise<boolean> {
    this.remoteAudioElement = remoteAudioElement;
    
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Set up peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      // Add local stream
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        if (this.remoteAudioElement && event.streams[0]) {
          this.remoteAudioElement.srcObject = event.streams[0];
          this.remoteAudioElement.play().catch(console.warn);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          netClient.sendSignal('*', {
            ice: event.candidate,
          });
        }
      };

      // Handle connection state
      this.peerConnection.onconnectionstatechange = () => {
        if (this.peerConnection) {
          this.isConnected = this.peerConnection.connectionState === 'connected';
        }
      };

      return true;
    } catch (error) {
      console.warn('Failed to initialize voice chat:', error);
      return false;
    }
  }

  async call(peerId: string = '*'): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      netClient.sendSignal(peerId, {
        sdp: offer,
      });
    } catch (error) {
      console.error('Failed to create call:', error);
    }
  }

  async handleSignal(data: any): Promise<void> {
    if (!this.peerConnection) return;

    try {
      switch (data.type) {
        case 'offer':
          await this.peerConnection.setRemoteDescription(data.offer);
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          netClient.sendSignal('*', {
            sdp: answer,
          });
          break;

        case 'answer':
          await this.peerConnection.setRemoteDescription(data.answer);
          break;

        case 'ice-candidate':
          await this.peerConnection.addIceCandidate(data.candidate);
          break;
      }
    } catch (error) {
      console.error('Failed to handle signal:', error);
    }
  }

  mute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      this.isMuted = true;
    }
  }

  unmute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      this.isMuted = false;
    }
  }

  getMutedState(): boolean {
    return this.isMuted;
  }

  getConnectionState(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
    }

    this.isConnected = false;
  }

  private setupRTCEventListeners(): void {
    // FIX: Use the correct event system
    // This will be handled when netClient receives rtc:signal from server
    // and we'll call handleSignal directly from the Match component
  }
}

export const voiceChat = new VoiceChat();