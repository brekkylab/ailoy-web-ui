import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAiloyAgentContext } from "./ailoy-agent-provider";

export function ReasoningSwitch() {
  const { isReasoning, setIsReasoning } = useAiloyAgentContext();

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="enable-reasoning"
        checked={isReasoning}
        onCheckedChange={setIsReasoning}
      />
      <Label htmlFor="enable-reasoning">Reasoning</Label>
    </div>
  );
}
