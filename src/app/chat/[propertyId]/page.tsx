import { notFound } from "next/navigation";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getAgentConfig } from "@/lib/config";
import { getPropertyById } from "@/lib/properties";

export default async function ChatPage({
  params,
}: {
  params: { propertyId: string };
}) {
  const property = await getPropertyById(params.propertyId);
  if (!property) notFound();

  return (
    <div className="h-[100dvh]">
      <ChatWidget property={property} agent={getAgentConfig()} />
    </div>
  );
}
