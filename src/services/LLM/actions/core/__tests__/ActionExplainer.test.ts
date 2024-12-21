import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
import { ActionPriority } from "../../types/ActionPriority";
import { ActionExplainer } from "../ActionExplainer";
import { ActionFactory } from "../ActionFactory";
import { IActionBlueprint } from "../IAction";

describe("ActionExplainer", () => {
  let actionExplainer: ActionExplainer;
  let mocker: UnitTestMocker;

  const testBlueprint: IActionBlueprint = {
    tag: "fetch_url",
    class: class {
      async execute() {
        return { success: true };
      }
    },
    description: "Fetch content from a URL",
    usageExplanation: `The fetch_url action allows you to retrieve content from URLs. Here are common use cases:

1. Fetch JSON data:
<fetch_url><url>https://api.example.com/data.json</url></fetch_url>

2. Fetch documentation:
<fetch_url><url>https://docs.example.com/guide</url></fetch_url>

Note:
- URL must start with http:// or https://
- Only use trusted domains
- Response is returned as text
- Large responses may be truncated
- Handle errors appropriately`,
    priority: ActionPriority.LOW,
    canRunInParallel: true,
    requiresProcessing: true,
    parameters: [
      {
        name: "url",
        required: true,
        description: "The URL to fetch content from",
      },
    ],
  };

  beforeAll(() => {
    actionExplainer = container.resolve(ActionExplainer);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  describe("explainAction", () => {
    it("should return explanation for a known action", () => {
      mocker.mockPrototype(ActionFactory, "getBlueprint", testBlueprint);

      const explanation = actionExplainer.explainAction("fetch_url");

      expect(explanation).toContain("<fetch_url>");
      expect(explanation).toContain(testBlueprint.description);
      expect(explanation).toContain(testBlueprint.usageExplanation);
      expect(explanation).toContain(
        "url (required): The URL to fetch content from",
      );
    });

    it("should return not found message for unknown action", () => {
      mocker.mockPrototype(ActionFactory, "getBlueprint", undefined);

      const explanation = actionExplainer.explainAction("unknown_action");

      expect(explanation).toBe("Action unknown_action not found.");
    });

    it("should show examples with proper XML structure (no extra whitespace)", () => {
      mocker.mockPrototype(ActionFactory, "getBlueprint", testBlueprint);

      const explanation = actionExplainer.explainAction("fetch_url");

      // Should contain examples with no extra whitespace between tags
      expect(explanation).toContain("<fetch_url><url>");
      expect(explanation).toContain("</url></fetch_url>");
      expect(explanation).not.toContain("<fetch_url>\n");
      expect(explanation).not.toContain("\n</fetch_url>");
    });
  });

  describe("explainAllActions", () => {
    it("should return explanations for all actions", () => {
      mocker.mockPrototype(ActionFactory, "getAllBlueprints", [testBlueprint]);

      const explanation = actionExplainer.explainAllActions();

      expect(explanation).toContain("<fetch_url>");
      expect(explanation).toContain(testBlueprint.description);
      expect(explanation).toContain(testBlueprint.usageExplanation);
      expect(explanation).toContain(
        "url (required): The URL to fetch content from",
      );
    });

    it("should return empty string when no actions are available", () => {
      mocker.mockPrototype(ActionFactory, "getAllBlueprints", []);

      const explanation = actionExplainer.explainAllActions();

      expect(explanation).toBe("");
    });
  });
});
