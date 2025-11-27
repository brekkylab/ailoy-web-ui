import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import * as ai from "ailoy-web";
import { useLocalStorage } from "usehooks-ts";

export interface AiloyLocalLMConfig {
  type: "local";
  modelName: string;
}

export interface AiloyAPILMConfig {
  type: "api";
  spec: ai.APISpecification;
  modelName: string;
  apiKey: string;
}

export type AiloyLMConfig = AiloyLocalLMConfig | AiloyAPILMConfig;

const AiloyAgentContext = createContext<{
  isWebGPUSupported: boolean;
  agent: ai.Agent | undefined;
  isAgentLoading: boolean;
  agentLoadingProgress: ai.CacheProgress | undefined;
  modelConfig: AiloyLMConfig | undefined;
  setModelConfig: (config: AiloyLMConfig) => void;
  isReasoning: boolean;
  setIsReasoning: (thinking: boolean) => void;
}>({
  isWebGPUSupported: false,
  agent: undefined,
  isAgentLoading: false,
  agentLoadingProgress: undefined,
  modelConfig: { type: "local", modelName: "Qwen/Qwen3-0.6B" },
  setModelConfig: () => {},
  isReasoning: false,
  setIsReasoning: () => {},
});

export function AiloyAgentProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const [isWebGPUSupported, setIsWebGPUSupported] = useState<boolean>(false);
  const [modelConfig, setModelConfig] = useLocalStorage<
    AiloyLMConfig | undefined
  >("ailoy-model-config", undefined, {
    initializeWithValue: true,
  });

  const [agent, setAgent] = useState<ai.Agent | undefined>(undefined);
  const [isAgentLoading, setIsAgentLoading] = useState<boolean>(false);
  const [agentLoadingProgress, setAgentLoadingProgress] = useState<
    ai.CacheProgress | undefined
  >(undefined);
  const [isReasoning, setIsReasoning] = useState<boolean>(false);

  useEffect(() => {
    setIsRendered(true);
    (async () => {
      const { supported } = await ai.isWebGPUSupported();
      setIsWebGPUSupported(supported);
    })();
  }, []);

  useEffect(() => {
    setAgent(undefined);

    if (!isRendered) return;
    if (modelConfig === undefined) {
      // Set default model config if not present
      setModelConfig({ type: "local", modelName: "Qwen/Qwen3-0.6B" });
      return;
    }

    if (modelConfig.type === "local" && !isWebGPUSupported) {
      return;
    }

    (async () => {
      setIsAgentLoading(true);

      let model: ai.LangModel;
      if (modelConfig.type === "local") {
        model = await ai.LangModel.newLocal(modelConfig.modelName, {
          progressCallback: setAgentLoadingProgress,
        });
      } else {
        model = await ai.LangModel.newStreamAPI(
          modelConfig.spec,
          modelConfig.modelName,
          modelConfig.apiKey,
        );
      }

      const agent = new ai.Agent(model);
      setAgent(agent);

      setAgentLoadingProgress(undefined);
      setIsAgentLoading(false);
    })();
  }, [modelConfig, isRendered, isWebGPUSupported]);

  return (
    <AiloyAgentContext.Provider
      value={{
        isWebGPUSupported,
        agent,
        isAgentLoading,
        agentLoadingProgress,
        modelConfig,
        setModelConfig,
        isReasoning,
        setIsReasoning,
      }}
    >
      {children}
    </AiloyAgentContext.Provider>
  );
}

export function useAiloyAgentContext() {
  const context = useContext(AiloyAgentContext);
  if (!context) {
    throw new Error(
      "useAiloyAgentContext must be used within AiloyAgentProvider",
    );
  }
  return context;
}
