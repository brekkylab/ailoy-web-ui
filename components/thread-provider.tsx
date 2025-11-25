import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as ai from "ailoy-web";
import {
  ExternalStoreThreadData,
  ExternalStoreThreadListAdapter,
} from "@assistant-ui/react";
import { useAiloyAgentContext } from "./ailoy-agent-provider";

// Create a context for thread management
const ThreadContext = createContext<{
  currentThreadId: string;
  setCurrentThreadId: (id: string) => void;
  threads: Map<string, ai.Message[]>;
  setThreads: React.Dispatch<React.SetStateAction<Map<string, ai.Message[]>>>;
  currentThreadMessages: ai.Message[];
  appendThreadMessage: (threadId: string, message: ai.Message) => void;
  threadListAdapter: ExternalStoreThreadListAdapter;
}>({
  currentThreadId: "default",
  setCurrentThreadId: () => {},
  threads: new Map(),
  setThreads: () => {},
  currentThreadMessages: [],
  appendThreadMessage: () => {},
  threadListAdapter: {},
});

export function ThreadProvider({ children }: { children: ReactNode }) {
  const [regularThreadList, setRegularThreadList] = useState<
    ExternalStoreThreadData<"regular">[]
  >([{ id: "default", status: "regular", title: "New Chat" }]);
  const [archivedThreadList, setArchivedThreadList] = useState<
    ExternalStoreThreadData<"archived">[]
  >([]);
  const [threads, setThreads] = useState<Map<string, ai.Message[]>>(
    new Map([["default", []]]),
  );
  const [currentThreadId, setCurrentThreadId] = useState("default");

  const currentThreadMessages = useMemo(() => {
    return threads.get(currentThreadId) ?? [];
  }, [currentThreadId, threads]);

  const appendThreadMessage = (threadId: string, newMessage: ai.Message) => {
    setThreads((prev) => {
      const next = new Map(prev);
      const messages = next.get(threadId) ?? [];
      next.set(threadId, [...messages, newMessage]);
      return next;
    });
  };

  const { isAgentLoading, modelConfig } = useAiloyAgentContext();

  useEffect(() => {
    // Clear all threads whenever modelConfig is changed
    setRegularThreadList([
      { id: "default", status: "regular", title: "New Chat" },
    ]);
    setThreads(new Map([["default", []]]));
  }, [modelConfig]);

  const threadListAdapter: ExternalStoreThreadListAdapter = {
    threadId: currentThreadId,
    threads: regularThreadList,
    archivedThreads: archivedThreadList,
    isLoading: isAgentLoading,
    onSwitchToNewThread: () => {
      const newId = `thread-${Date.now()}`;
      setRegularThreadList((prev) => [
        ...prev,
        {
          id: newId,
          status: "regular",
          title: "New Chat",
        },
      ]);
      setThreads((prev) => new Map(prev).set(newId, []));
      setCurrentThreadId(newId);
    },
    onSwitchToThread: (threadId) => {
      setCurrentThreadId(threadId);
    },
    onRename: (threadId, newTitle) => {
      setRegularThreadList((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, title: newTitle } : t)),
      );
    },
    onArchive: (threadId) => {
      const targetThread = regularThreadList.find((t) => t.id === threadId);
      if (targetThread) {
        setRegularThreadList((prev) =>
          prev.filter((t) => t.id !== targetThread.id),
        );
        setArchivedThreadList((prev) => [
          ...prev,
          { ...targetThread, status: "archived" },
        ]);
        setThreads((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        if (currentThreadId === threadId) {
          setCurrentThreadId("default");
        }
      }
    },
    onDelete: (threadId) => {
      setRegularThreadList((prev) => prev.filter((t) => t.id !== threadId));
      setThreads((prev) => {
        const next = new Map(prev);
        next.delete(threadId);
        return next;
      });
      if (currentThreadId === threadId) {
        setCurrentThreadId("default");
      }
    },
  };

  return (
    <ThreadContext.Provider
      value={{
        currentThreadId,
        setCurrentThreadId,
        threads,
        setThreads,
        currentThreadMessages,
        appendThreadMessage,
        threadListAdapter,
      }}
    >
      {children}
    </ThreadContext.Provider>
  );
}

// Hook for accessing thread context
export function useThreadContext() {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error("useThreadContext must be used within ThreadProvider");
  }
  return context;
}
