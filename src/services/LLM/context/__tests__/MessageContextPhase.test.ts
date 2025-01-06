import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
import { PhaseManager } from "../../PhaseManager";
import { MessageContextBuilder } from "../MessageContextBuilder";
import { MessageContextHistory } from "../MessageContextHistory";
import { MessageContextLogger } from "../MessageContextLogger";
import { MessageContextPhase } from "../MessageContextPhase";
import { MessageContextStore } from "../MessageContextStore";

describe("MessageContextPhase", () => {
  let messageContextPhase: MessageContextPhase;
  let messageContextStore: MessageContextStore;
  let messageContextLogger: MessageContextLogger;
  let messageContextBuilder: MessageContextBuilder;
  let phaseManager: PhaseManager;
  let messageContextHistory: MessageContextHistory;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();
    messageContextPhase = container.resolve(MessageContextPhase);
    messageContextStore = container.resolve(MessageContextStore);
    messageContextLogger = container.resolve(MessageContextLogger);
    messageContextBuilder = container.resolve(MessageContextBuilder);
    phaseManager = container.resolve(PhaseManager);
    messageContextHistory = container.resolve(MessageContextHistory);
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  describe("cleanupPhaseContent", () => {
    it("should clear phase instructions during phase transition", () => {
      // Setup initial context with phase instructions
      const initialContextData = {
        phaseInstructions: new Map([
          [
            "phase1",
            { phase: "phase1", content: "instruction1", timestamp: 1 },
          ],
          [
            "phase2",
            { phase: "phase2", content: "instruction2", timestamp: 2 },
          ],
        ]),
        fileOperations: new Map(),
        commandOperations: new Map(),
        conversationHistory: [],
        systemInstructions: null,
      };

      // Mock the store to return our initial context
      const getContextDataSpy = mocker
        .spyPrototype(MessageContextStore, "getContextData")
        .mockReturnValue(initialContextData);

      // Mock setContextData to capture the updated data
      const setContextDataSpy = mocker.spyPrototype(
        MessageContextStore,
        "setContextData",
      );

      // Call cleanupPhaseContent
      messageContextPhase.cleanupPhaseContent();

      // Verify getContextData was called
      expect(getContextDataSpy).toHaveBeenCalled();

      // Verify setContextData was called with cleared phase instructions
      expect(setContextDataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          phaseInstructions: new Map(),
          fileOperations: expect.any(Map),
          commandOperations: expect.any(Map),
          conversationHistory: expect.any(Array),
          systemInstructions: null,
        }),
      );

      // Verify that other context data was preserved
      const updatedData = setContextDataSpy.mock.calls[0][0];
      expect(updatedData.fileOperations.size).toBe(0);
      expect(updatedData.commandOperations.size).toBe(0);
      expect(updatedData.conversationHistory).toEqual([]);
      expect(updatedData.systemInstructions).toBeNull();
    });

    it("should clean phase-related messages from conversation history", () => {
      // Setup initial context with mixed messages
      const initialContextData = {
        phaseInstructions: new Map(),
        fileOperations: new Map(),
        commandOperations: new Map(),
        conversationHistory: [
          {
            role: "system",
            content: "<phase_prompt>Phase instruction</phase_prompt>",
          },
          { role: "user", content: "Regular message" },
          {
            role: "assistant",
            content:
              "Message with <phase_prompt>embedded phase</phase_prompt> and content",
          },
          {
            role: "user",
            content: "<phase_prompt>Only phase content</phase_prompt>",
          },
        ],
        systemInstructions: null,
      };

      // Mock the store to return our initial context
      const getContextDataSpy = mocker
        .spyPrototype(MessageContextStore, "getContextData")
        .mockReturnValue(initialContextData);

      // Mock setContextData to capture the updated data
      const setContextDataSpy = mocker.spyPrototype(
        MessageContextStore,
        "setContextData",
      );

      // Call cleanupPhaseContent
      messageContextPhase.cleanupPhaseContent();

      // Verify the conversation history is cleaned correctly
      const updatedData = setContextDataSpy.mock.calls[0][0];
      expect(updatedData.conversationHistory).toHaveLength(2);
      expect(updatedData.conversationHistory).toEqual([
        { role: "user", content: "Regular message" },
        {
          role: "assistant",
          content: "Message with  and content",
        },
      ]);
    });
  });
});
