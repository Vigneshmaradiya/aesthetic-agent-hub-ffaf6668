import { getAllPrompts } from "@/lib/prompts/prompt-registry";
import PromptEditor from "./PromptEditor";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const prompts = getAllPrompts();
  return <PromptEditor initialPrompts={prompts} />;
}
