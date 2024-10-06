import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import { instructions } from '../utils/conversation_config.js';
import { WavRenderer } from '../utils/wav_renderer';

import { X, Edit, Zap, ArrowUp, ArrowDown } from 'react-feather';
import { Button } from '../components/button/Button';
import { Toggle } from '../components/toggle/Toggle';
import { Map } from '../components/Map';

import './ConsolePage.scss';

export function ConsolePage() {
  // State to track if we are connected to the conversation
  const [isConnected, setIsConnected] = useState(false);
  // State to track if push-to-talk mode is available
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  // State to track if we are currently recording audio
  const [isRecording, setIsRecording] = useState(false);

  // References for the client, recorder, and player instances
  const clientRef = useRef<RealtimeClient>(null);
  const wavRecorderRef = useRef<WavRecorder>(null);
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(null);

  // Initialize the RealtimeClient, WavRecorder, and WavStreamPlayer
  useEffect(() => {
    clientRef.current = new RealtimeClient(/* client initialization */);
    wavRecorderRef.current = new WavRecorder(/* recorder initialization */);
    wavStreamPlayerRef.current = new WavStreamPlayer(/* player initialization */);

    return () => {
      // Clean up resources when component is unmounted
      clientRef.current?.disconnect();
      wavRecorderRef.current?.stop();
      wavStreamPlayerRef.current?.disconnect();
    };
  }, []);

  // Handler to start recording audio
  const startRecording = async () => {
    setIsRecording(true); // Set recording state to true
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    if (!client || !wavRecorder || !wavStreamPlayer) return;
    
    // Interrupt any ongoing audio playback to start a new recording
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      // Cancel the current response if there's one ongoing
      await client.cancelResponse(trackId, offset);
    }
    // Start recording and pass the audio data to the client
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  // Handler to stop recording audio
  const stopRecording = async () => {
    setIsRecording(false); // Set recording state to false
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;

    if (!client || !wavRecorder) return;
    
    // Pause the recording
    await wavRecorder.pause();
    // Signal the client to create a response based on the recorded audio
    client.createResponse();
  };

  // Main rendering of the console page
  return (
    <div data-component="ConsolePage">
      {/* Main content container */}
      <div className="content-actions">
        {/* Toggle to switch between manual and VAD (Voice Activity Detection) mode */}
        <Toggle
          defaultValue={false}
          labels={['manual', 'vad']}
          values={['none', 'server_vad']}
          onChange={(_, value) => {
            // Logic to change turn-end type based on toggle selection
            setCanPushToTalk(value === 'none');
          }}
        />
        <div className="spacer" />
        {/* Push-to-talk button, available when connected and in manual mode */}
        {isConnected && canPushToTalk && (
          <Button
            label={isRecording ? 'release to send' : 'push to talk'} // Button label changes based on recording state
            buttonStyle={isRecording ? 'alert' : 'regular'} // Style changes to indicate active recording
            disabled={!isConnected || !canPushToTalk} // Disable button if not connected or not in push-to-talk mode
            onMouseDown={startRecording} // Start recording on mouse down
            onMouseUp={stopRecording} // Stop recording on mouse up
            onTouchStart={startRecording} // Added touch start event for mobile devices to start recording
            onTouchEnd={stopRecording} // Added touch end event for mobile devices to stop recording
          />
        )}
        <div className="spacer" />
        {/* Connect or disconnect button */}
        <Button
          label={isConnected ? 'disconnect' : 'connect'} // Label changes based on connection state
          iconPosition={isConnected ? 'end' : 'start'} // Icon position changes depending on connection state
          icon={isConnected ? X : Zap} // Icon changes depending on connection state
          buttonStyle={isConnected ? 'regular' : 'action'} // Style changes depending on connection state
          onClick={
            isConnected
              ? () => {
                  // Logic to disconnect
                  clientRef.current?.disconnect();
                  setIsConnected(false);
                }
              : async () => {
                  // Logic to connect
                  try {
                    await clientRef.current?.connect();
                    setIsConnected(true);
                  } catch (error) {
                    console.error('Connection failed', error);
                  }
                }
          }
        />
      </div>
    </div>
  );
}