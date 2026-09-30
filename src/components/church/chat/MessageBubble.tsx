import { Check, CheckCheck, Clock } from "lucide-react";
import type { ChatMessage } from "@/lib/chat-types";
import { cn } from "@/components/church/ui";
import { formatBubbleTime } from "@/components/church/chat/chat-utils";

function StatusTicks({ message }: { message: ChatMessage }) {
  if (message.failed) {
    return <span className="text-[10px] font-medium text-red-400">Failed</span>;
  }
  if (message.pending) {
    return <Clock className="h-3.5 w-3.5 text-primary-foreground/60" aria-label="Sending" />;
  }
  if (message.recipientRead) {
    return <CheckCheck className="h-3.5 w-3.5 text-sky-200" aria-label="Read" />;
  }
  return <Check className="h-3.5 w-3.5 text-primary-foreground/60" aria-label="Sent" />;
}

type MessageBubbleProps = {
  message: ChatMessage;
  mine: boolean;
  senderName?: string;
  showSenderName?: boolean;
};

export function MessageBubble({ message, mine, senderName, showSenderName }: MessageBubbleProps) {
  return (
    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(88%,28rem)] rounded-2xl px-3.5 py-2 shadow-sm",
          mine
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border/50 bg-card text-foreground"
        )}
      >
        {!mine && message.broadcast && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">Broadcast</p>
        )}
        {showSenderName && senderName && (
          <p className="mb-1 text-xs font-semibold text-primary">{senderName}</p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums",
            mine ? "text-primary-foreground/75" : "text-muted-foreground"
          )}
        >
          {mine && <StatusTicks message={message} />}
          <span>{formatBubbleTime(message.sentAt)}</span>
        </div>
      </div>
    </div>
  );
}
