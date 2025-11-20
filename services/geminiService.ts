import { GoogleGenAI } from "@google/genai";
import { McpToolCall } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Simulates an MCP Server interaction.
 * 
 * The "Tool" here is `edit_html_report`.
 * The model acts as the intelligent agent that decides how to call the tool,
 * but for this specific frontend-only implementation, the Model *IS* the tool executor
 * as well, returning the modified HTML directly to save roundtrips.
 */
export const generateReportModification = async (
  currentHtml: string, 
  userPrompt: string
): Promise<string> => {
  
  const model = "gemini-2.5-flash";
  
  const systemInstruction = `
    You are an advanced MCP (Model Context Protocol) Agent specialized in DFIR Report generation and HTML Manipulation.
    
    Your primary tool is "edit_html". 
    
    CONTEXT:
    You have the current HTML source code of a Digital Forensics Incident Report.
    The user will ask you to modify data, fix typos, change severity levels, or add new sections.
    
    RULES:
    1. You MUST return the FULL, VALID HTML string as the result.
    2. Do NOT return markdown code blocks (no \`\`\`html). Return raw string only.
    3. PRESERVE the existing CSS in the <style> tags. Do not remove it.
    4. PRESERVE the JavaScript logic at the bottom unless asked to change functionality.
    5. If the user asks to change data (e.g. "Change severity to Critical"), find the HTML element and update the text/class accordingly.
    6. If the user asks for analysis, you can insert a new card in the HTML with the analysis.
    
    CURRENT HTML LENGTH: ${currentHtml.length} characters.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
            text: `CURRENT_HTML:\n${currentHtml}\n\nUSER_REQUEST: ${userPrompt}`
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Low temperature for precision in code
      }
    });

    let rawText = response.text || "";
    
    // Cleanup if the model accidentally added markdown blocks
    if (rawText.startsWith("```html")) {
        rawText = rawText.replace(/^```html/, "").replace(/```$/, "");
    } else if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```/, "").replace(/```$/, "");
    }

    return rawText.trim();

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to process the report modification request.");
  }
};
