const { generateExpenseContent } = require("../services/ai.api");

module.exports.expenses = async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const response = await generateExpenseContent(prompt);
    console.log("Generated Content:", response);  
    return res.json({ message: response });  
  } catch (error) {
    console.error("Error in expenseController:", error.message);
    return res.status(500).json({ error: "Failed to generate expense content" });
  }
};
