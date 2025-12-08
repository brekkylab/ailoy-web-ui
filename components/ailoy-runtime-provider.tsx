import {
  type AppendMessage,
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import * as ai from "ailoy-web";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  type AssistantUiMessage,
  convertMessage,
  convertMessageDelta,
  restoreMessages,
} from "@/lib/message-converter";
import {
  agentStreamEventTarget,
  useAiloyAgentContext,
} from "./ailoy-agent-provider";
import { useThreadContext } from "./thread-provider";

export function AiloyRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [ongoingMessage, setOngoingMessage] = useState<ai.MessageDelta | null>(
    null,
  );
  const [isAnswering, setIsAnswering] = useState<boolean>(false);

  const { agentInitialized, agentRunConfig, runAgent, systemPrompt } =
    useAiloyAgentContext();

  const {
    currentThreadId,
    currentThreadMessages,
    appendThreadMessage,
    renameThread,
    threadListAdapter,
  } = useThreadContext();

  // biome-ignore lint/correctness/useExhaustiveDependencies: false-positive
  useEffect(() => {
    agentStreamEventTarget.addEventListener(
      "agent-stream-delta",
      accumulateAgentStreamDelta,
    );
    agentStreamEventTarget.addEventListener(
      "agent-stream-finished",
      onAgentStreamFinished,
    );

    return () => {
      agentStreamEventTarget.removeEventListener(
        "agent-stream-delta",
        accumulateAgentStreamDelta,
      );
      agentStreamEventTarget.removeEventListener(
        "agent-stream-finished",
        onAgentStreamFinished,
      );
    };
  }, [currentThreadId]);

  let accumulated: ai.MessageDelta | null = null;
  const accumulateAgentStreamDelta = async (e: Event) => {
    const { delta, finish_reason } = (e as CustomEvent<ai.MessageDeltaOutput>)
      .detail;

    accumulated =
      accumulated === null
        ? delta
        : ai.accumulateMessageDelta(accumulated, delta);
    setOngoingMessage({ ...accumulated });

    if (finish_reason !== undefined) {
      const newMessage = ai.finishMessageDelta(accumulated);
      appendThreadMessage(currentThreadId, convertMessage(newMessage));
      setOngoingMessage(null);
      accumulated = null;
    }
  };

  const onAgentStreamFinished = () => {
    setIsAnswering(false);
  };

  const onNew = async (message: AppendMessage) => {
    if (!agentInitialized) throw new Error("Agent is not initialized yet");

    const userContents: ai.Part[] = [];

    // Add attachments
    if (message.attachments !== undefined) {
      for (const attach of message.attachments) {
        if (attach.type === "image") {
          // biome-ignore lint/style/noNonNullAssertion: attach should have file
          const ab = await attach.file!.arrayBuffer();
          const arr = new Uint8Array(ab);
          const imagePart = ai.imageFromBytes(arr);
          userContents.push(imagePart);
        }
        // other types are skipped
      }
    }

    // Add text prompt
    if (message.content[0]?.type !== "text")
      throw new Error("Only text messages are supported");
    userContents.push({ type: "text", text: message.content[0].text });

    // Set messages
    const newMessage: ai.Message = {
      role: "user",
      contents: userContents,
    };
    appendThreadMessage(currentThreadId, convertMessage(newMessage));
    // Rename thread if this is a first message in this thread
    if (currentThreadMessages.length === 0) {
      renameThread(currentThreadId, message.content[0].text.substring(0, 30));
    }

    // Run agent with messages and config
    let msgs = [...restoreMessages(currentThreadMessages), newMessage];
    if (systemPrompt !== "") {
      msgs = [
        { role: "system", contents: [{ type: "text", text: systemPrompt }] },
        ...msgs,
      ];
    }
    runAgent(msgs, agentRunConfig);
    setIsAnswering(true);
  };

  const convertedMessages: AssistantUiMessage[] = useMemo(() => {
    let messages = currentThreadMessages;
    if (ongoingMessage !== null) {
      const convertedDelta = convertMessageDelta(ongoingMessage);
      messages = [...messages, convertedDelta];
    }
    return messages;
  }, [currentThreadMessages, ongoingMessage]);

  const runtime = useExternalStoreRuntime({
    isDisabled: !agentInitialized,
    isRunning: isAnswering,
    messages: useExternalMessageConverter({
      messages: convertedMessages,
      callback: (msg) => msg,
      isRunning: isAnswering,
    }),
    onNew,
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
      threadList: threadListAdapter,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
