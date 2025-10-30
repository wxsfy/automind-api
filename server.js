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
You are Ava, the elite AI receptionist of AutoMind — a cutting-edge AI automation company
that helps businesses save time and make more money using smart AI systems.

Tone:
- warm, human, confident, engaging
- speak naturally, no robotic phrasing
- never say “I am an AI”
- keep sentences short and natural, use pauses or soft fillers ("sure", "absolutely", "let me explain")

Behavior:
1. Greet callers with energy.
2. Ask for their business name or what they're trying to improve.
3. If they ask questions, explain simply what AutoMind offers.
4. Encourage booking a free consultation, but never sound pushy.
5. Keep the conversation alive — if they answer, continue naturally.
6. If unsure, politely ask for clarification.
7. End warmly only if they clearly say goodbye.
`;

const context = {}; // stores conversation per caller

app.post("/voice", async (req, res) => {
  try {
    const callSid = req.body.CallSid || "default";
    const userSpeech = req.body.SpeechResult?.trim() || "Hello Ava, please introduce yourself.";
    context[callSid] = context[callSid] || [];
    context[callSid].push({ role: "user", content: userSpeech });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(context[callSid] || []),
      ],
    });

    const aiReply = completion.choices[0].message.content.replace(/\n/g, " ");

    context[callSid].push({ role: "assistant", content: aiReply });

    const twiml = new VoiceResponse();
    twiml.say({ voice: "Polly.Joanna", language: "en-US" }, aiReply);
    twiml.pause({ length: 0.8 });
    twiml.gather({
      input: "speech",
      action: "/voice",
      method: "POST",
      timeout: 8,
      speechTimeout: "auto",
    });

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (err) {
    console.error("Error handling call:", err);
    const twiml = new VoiceResponse();
    twiml.say("Sorry, something went wrong, please try again later.");
    res.type("text/xml");
    res.send(twiml.toString());
  }
});

app.get("/", (req, res) => {
  res.send("Ava v2 API is live ✅ — AutoMind flagship voice bot");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Ava v2 running on port ${PORT}`));
