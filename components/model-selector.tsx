import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  type AiloyLocalLMConfig,
  type AiloyAPILMConfig,
  useAiloyAgentContext,
} from "./ailoy-agent-provider";

type AiloyAPILMConfigPartial = Omit<AiloyAPILMConfig, "apiKey">;
type ModelConfig = AiloyLocalLMConfig | AiloyAPILMConfigPartial;

const models: ModelConfig[] = [
  { type: "local", modelName: "Qwen/Qwen3-0.6B" },
  { type: "local", modelName: "Qwen/Qwen3-1.7B" },
  { type: "local", modelName: "Qwen/Qwen3-4B" },
  { type: "api", spec: "OpenAI", modelName: "gpt-4o" },
  { type: "api", spec: "Gemini", modelName: "gemini-2.5-flash" },
  { type: "api", spec: "Claude", modelName: "claude-sonnet-4-5" },
  { type: "api", spec: "Grok", modelName: "grok-4-fast" },
];

export function ModelSelector() {
  // To prevent hydration error
  const [mounted, setMounted] = useState(false);

  const { modelConfig, setModelConfig } = useAiloyAgentContext();
  const [apiKey, setApiKey] = useState("");
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [pendingModel, setPendingModel] = useState<
    AiloyAPILMConfigPartial | undefined
  >(undefined);

  useEffect(() => setMounted(true), []);

  const handleModelSelect = (modelName: string) => {
    const model = models.find((m) => modelName === m.modelName)!;
    if (model.type === "api") {
      setPendingModel(model);
      setShowDialog(true);
    } else {
      setModelConfig(model);
    }
  };

  const handleApiKeySubmit = () => {
    if (pendingModel && apiKey.trim()) {
      setModelConfig({ ...pendingModel, apiKey });
      setApiKey("");
      setShowDialog(false);
      setPendingModel(undefined);
    }
  };

  const localModels = models.filter((m) => m.type === "local");
  const apiModels = models.filter((m) => m.type === "api");

  if (!mounted) return null;

  return (
    <>
      <Select value={modelConfig?.modelName} onValueChange={handleModelSelect}>
        <SelectTrigger id="model-select" className="w-1/2">
          <div className="flex w-full items-center justify-between">
            <SelectValue placeholder="Select a model..." />
            {modelConfig && (
              <span
                className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${modelConfig.type === "local" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
              >
                {modelConfig.type === "local" ? "Local" : modelConfig.spec}
              </span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5">
            <p className="mb-2 text-xs font-semibold text-gray-500">
              LOCAL MODELS
            </p>
            {localModels.map((model) => {
              const isSelected = modelConfig?.modelName === model.modelName;
              return (
                <SelectItem key={model.modelName} value={model.modelName}>
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                    <span>{model.modelName}</span>
                  </div>
                </SelectItem>
              );
            })}
          </div>

          <div className="px-2 py-1.5">
            <p className="mb-2 text-xs font-semibold text-gray-500">
              API MODELS
            </p>
            {apiModels.map((model) => {
              const isSelected = modelConfig?.modelName === model.modelName;
              return (
                <SelectItem key={model.modelName} value={model.modelName}>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Check className="h-4 w-4 text-purple-600" />
                    )}
                    <span>{model.modelName}</span>
                    <span className="text-xs text-gray-500">
                      ({model.spec})
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </div>
        </SelectContent>
      </Select>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key Required</DialogTitle>
            <DialogDescription>
              Enter your {pendingModel?.spec} API Key to use{" "}
              <span className="font-medium">{pendingModel?.modelName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Label htmlFor="api-key" className="text-sm font-medium">
              {pendingModel?.spec} API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Paste your API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApiKeySubmit();
              }}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setApiKey("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleApiKeySubmit} disabled={!apiKey.trim()}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
