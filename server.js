import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const VoiceResponse = twilio.twiml.VoiceResponse;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

const SYSTEM_PROMPT = `
You are Ava, the AI receptionist for AutoMind — a Canadian AI automation company
that builds smart systems to help businesses work faster, smarter, and with less effort.

Your tone: articulate, confident, natural, and friendly.
Your goal: Greet callers, understand their business, and offer a free consultation.
Always sound human, never robotic. Keep answers short and clear.
`;

app.post("/voice", async (req, res) => {
  try {
    const userSpeech = req.body.SpeechResult?.trim() || "Hello Ava, please introduce yourself.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userSpeech },
      ],
    });

    const aiReply = completion.choices[0].message.content;
    const twiml = new VoiceResponse();
    twiml.say({ voice: "Polly.Joanna", language: "en-US" }, aiReply);

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (err) {
    console.error("Error handling call:", err);
    const twiml = new VoiceResponse();
    twiml.say("Sorry, something went wrong. Please try again later.");
    res.type("text/xml");
    res.send(twiml.toString());
  }
});

app.get("/", (req, res) => {
  res.send("Ava API is running ✅");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
