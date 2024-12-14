import { container } from "tsyringe";
import { MessageContextExtractor } from "../MessageContextExtractor";

describe("MessageContextExtractor", () => {
  let extractor: MessageContextExtractor;

  beforeEach(() => {
    extractor = container.resolve(MessageContextExtractor);
  });

  it("should extract non-operation content correctly", () => {
    const content =
      "This is a test <read_file><path>file1</path></read_file> string with <write_file><path>file2</path></write_file> some <execute_command><command>command1</command></execute_command> operations and <phase_prompt>phase instruction</phase_prompt> other text.";
    const expected =
      "This is a test string with some operations and other text.";
    expect(extractor.extractNonOperationContent(content)).toBe(expected);
    const contentWithNoTags = "This is a simple text";
    expect(extractor.extractNonOperationContent(contentWithNoTags)).toBe(
      contentWithNoTags,
    );

    const contentWithOnlyPhasePrompt =
      "<phase_prompt>phase instruction</phase_prompt>";
    expect(
      extractor.extractNonOperationContent(contentWithOnlyPhasePrompt),
    ).toBe("");
  });

  it("should extract non-operation content with no tags correctly", () => {
    const content = "This is a simple text";
    expect(extractor.extractNonOperationContent(content)).toBe(content);
  });

  it("should extract operations correctly", () => {
    const content =
      "Some content before <read_file><path>file1</path></read_file> and <write_file><path>file2</path></write_file> and <execute_command><command>command1</command></execute_command> after";
    const operations = extractor.extractOperations(content);
    expect(operations).toHaveLength(3);
    expect(operations[0].type).toBe("read_file");
    if (
      operations[0].type === "read_file" ||
      operations[0].type === "write_file"
    ) {
      expect(operations[0].path).toBe("file1");
    }

    expect(operations[1].type).toBe("write_file");
    if (
      operations[1].type === "read_file" ||
      operations[1].type === "write_file"
    ) {
      expect(operations[1].path).toBe("file2");
    }

    expect(operations[2].type).toBe("execute_command");
    if (operations[2].type === "execute_command") {
      expect(operations[2].command).toBe("command1");
    }

    const contentWithoutOperations = "Some content without operations";
    expect(extractor.extractOperations(contentWithoutOperations)).toHaveLength(
      0,
    );
  });

  it("should extract phase prompt correctly", () => {
    const content =
      "Some content before <phase_prompt>phase instruction</phase_prompt> after";
    const prompt = extractor.extractPhasePrompt(content);
    expect(prompt).toBe("phase instruction");

    const contentWithoutPrompt = "Some content without phase prompt";
    expect(extractor.extractPhasePrompt(contentWithoutPrompt)).toBe(null);

    const contentWithNoTextInPrompt =
      "Some content before <phase_prompt></phase_prompt> after";
    expect(extractor.extractPhasePrompt(contentWithNoTextInPrompt)).toBe("");
  });
});
