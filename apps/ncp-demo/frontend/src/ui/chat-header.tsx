type ChatHeaderProps = {
  title: string;
  streamRunDisabled: boolean;
  abortDisabled: boolean;
  onStreamRun: () => void;
  onAbort: () => void;
};

export function ChatHeader({
  title,
  streamRunDisabled,
  abortDisabled,
  onStreamRun,
  onAbort,
}: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <h1>{title}</h1>
      <div className="header-actions">
        <button className="ghost" onClick={onStreamRun} disabled={streamRunDisabled}>
          stream last run
        </button>
        <button className="danger" onClick={onAbort} disabled={abortDisabled}>
          abort
        </button>
      </div>
    </header>
  );
}
