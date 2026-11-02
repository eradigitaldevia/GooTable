import ReactMarkdown from "react-markdown";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MensagemSuporte } from "@/hooks/use-suporte";

export function SuporteMensagem({ mensagem }: { mensagem: MensagemSuporte }) {
  const user = mensagem.role === "user";
  return (
    <div className={cn("flex gap-3", user && "justify-end")}>
      {!user && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LifeBuoy className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] text-sm",
          user
            ? "rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-foreground whitespace-pre-wrap"
            : "prose prose-sm max-w-none text-foreground dark:prose-invert",
        )}
      >
        {user ? mensagem.content : <ReactMarkdown>{mensagem.content}</ReactMarkdown>}
      </div>
    </div>
  );
}
