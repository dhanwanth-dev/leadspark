import type { ChatMessage } from "@/lib/types";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex px-3 mb-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[85%] px-2.5 pt-1.5 pb-1 shadow-sm ${
          isUser
            ? "bg-[#d9fdd3] rounded-lg rounded-tr-sm"
            : "bg-white rounded-lg rounded-tl-sm"
        }`}
      >
        <p className="text-[14.5px] leading-[1.35] text-[#111b21] whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div className="flex justify-end mt-0.5">
          <span className="text-[11px] text-[#667781] pl-2">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}
