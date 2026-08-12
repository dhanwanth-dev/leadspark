export function TypingIndicator() {
  return (
    <div className="flex justify-start px-3 mb-2">
      <div className="bg-white rounded-lg rounded-tl-sm px-3 py-2 shadow-sm flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-[#667781] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#667781] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#667781] animate-bounce" />
      </div>
    </div>
  );
}
