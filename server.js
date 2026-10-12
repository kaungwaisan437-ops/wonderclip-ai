import express from "express";
import multer from "multer";
import { fal } from "@fal-ai/client";

const app = express();
const port = process.env.PORT || 3000;

if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

app.use(express.static("public"));

app.post(
  "/api/generate",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!process.env.FAL_KEY) {
        return res.status(500).json({
          error: "FAL_KEY မသတ်မှတ်ရသေးပါ။"
        });
      }

      const prompt = String(
        req.body.prompt || ""
      ).trim();

      const mode = req.body.mode;

      if (!prompt || prompt.length > 2000) {
        return res.status(400).json({
          error: "Prompt ကို စစ်ဆေးပါ။"
        });
      }

      let model;
      const input = { prompt };

      if (mode === "image") {
        if (!req.file) {
          return res.status(400).json({
            error: "ပုံတစ်ပုံ ရွေးပေးပါ။"
          });
        }

        const allowed = [
          "image/jpeg",
          "image/png",
          "image/webp"
        ];

        if (!allowed.includes(req.file.mimetype)) {
          return res.status(400).json({
            error: "JPEG, PNG, WebP ပုံကိုသာ သုံးပါ။"
          });
        }

        model = "fal-ai/ltx-2.3-22b/image-to-video";

        const base64 = req.file.buffer.toString("base64");

        input.image_url =
          `data:${req.file.mimetype};base64,${base64}`;

      } else if (mode === "text") {
        model = "fal-ai/ltx-2.3-22b/text-to-video";

      } else {
        return res.status(400).json({
          error: "Video ဖန်တီးနည်းကို ရွေးပါ။"
        });
      }

      const result = await fal.subscribe(model, {
        input,
        logs: false
      });

      const videoUrl = result.data?.video?.url;

      if (!videoUrl) {
        return res.status(502).json({
          error: "Video URL မရရှိပါ။"
        });
      }

      res.json({ videoUrl });

    } catch (error) {
      console.error("Generation error:", error);

      res.status(500).json({
        error: "Video မဖန်တီးနိုင်ပါ။ Server နဲ့ API ကို စစ်ပါ။"
      });
    }
  }
);

app.listen(port, "0.0.0.0", () => {
  console.log(
    `WonderClip AI running on port ${port}`
  );
});