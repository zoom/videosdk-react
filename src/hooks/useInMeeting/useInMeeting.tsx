import React from "react";
import ZoomVideo, { ConnectionState, type event_connection_change } from "@zoom/videosdk";

/**
 * @internal
 * Tracks whether the local user is currently in a session, updating reactively as the
 * connection state changes — so a consuming hook resubscribes when the user joins even
 * if it mounted before the session connected.
 *
 * Centralizes the `connection-change` subscription shared by the media-state hooks.
 *
 * @param onClose - Optional callback run when the session closes, used to reset hook state.
 * @returns Whether the local user is currently in a session
 */
const useInMeeting = (onClose?: () => void) => {
  const client = ZoomVideo.createClient();
  const [inMeeting, setInMeeting] = React.useState<boolean>(
    () => client.getSessionInfo().isInMeeting,
  );

  // Keep the latest onClose without resubscribing the listener on every render
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  React.useEffect(() => {
    const connectionHandler: typeof event_connection_change = (event) => {
      if (event.state === ConnectionState.Connected) {
        setInMeeting(true);
      } else if (event.state === ConnectionState.Closed) {
        setInMeeting(false);
        onCloseRef.current?.();
      }
    };
    client.on("connection-change", connectionHandler);
    return () => {
      client.off("connection-change", connectionHandler);
    };
  }, [client]);

  return inMeeting;
};

export default useInMeeting;
