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
  
  // Use Flash Lite for low latency as requested
  const model = "gemini-2.5-flash-lite";
  
  const systemInstruction = `
    You are an advanced MCP (Model Context Protocol) Agent specialized in DFIR Report generation and HTML Manipulation.
    
    OBJECTIVE:
    Modify the provided HTML based on the USER_REQUEST while keeping the rest of the document EXACTLY as it is.
    
    CRITICAL RULES:
    1. **FULL OUTPUT REQUIRED**: You must return the COMPLETE HTML document, from <!DOCTYPE html> to </html>.
    2. **NO PLACEHOLDERS**: Never use comments like "<!-- rest of code -->" or "...". Output every single line of the original code that wasn't modified.
    3. **NO MARKDOWN**: Return raw string only. Do not wrap in \`\`\`html.
    4. **PRESERVE STYLE**: Do not modify the <style> block unless explicitly asked.
    5. **PRESERVE SCRIPTS**: Do not modify the <script> block at the end unless explicitly asked.
    6. **TARGETED EDITS**: Only modify the specific HTML elements relevant to the user's request. Leave all other sections (Timeline, IOCs, Header) identical to the input.
    
    FAILURE TO RETURN THE FULL CODE WILL BREAK THE SYSTEM.
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
        temperature: 0.1, // Lower temperature for maximum precision
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