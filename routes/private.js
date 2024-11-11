import express from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// Middleware para upload de arquivos usando multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");

    // Cria a pasta caso não exista
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir); // Define a pasta onde os arquivos serão armazenados
  },
  filename: (req, file, cb) => {
    // Validação do tipo de arquivo
    if (!file.originalname.match(/\.(ipynb)$/)) {
      // Aceitando apenas arquivos .ipynb
      return cb(new Error("Only IPYNB files are allowed"));
    }
    cb(null, `${Date.now()}-${file.originalname}`); // Nome do arquivo único
  },
});

const upload = multer({ storage });

// Rota para upload de arquivo .ipynb (somente para professores)
router.post("/upload", upload.single("ipynbFile"), async (req, res) => {
  console.log("Arquivo recebido:", req.file);
  console.log("Dados do corpo:", req.body);

  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ error: "Access denied. Only teachers can upload files." });
    }

    const { title, lessonId, newLessonTitle } = req.body;
    const filePath = req.file?.path;

    if (!title || !filePath) {
      return res.status(400).json({ error: "Title or file path is missing." });
    }

    let lessonIdToUse = lessonId;

    if (newLessonTitle) {
      const newLesson = await prisma.lesson.create({
        data: {
          title: newLessonTitle,
        },
      });
      lessonIdToUse = newLesson.id;
    }

    const file = await prisma.file.create({
      data: {
        title,
        filePath,
        lessonId: lessonIdToUse,
      },
    });

    res.status(201).json({ message: "File uploaded successfully", file });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// Rota para listar os arquivos .ipynb disponíveis para os estudantes
router.get("/aulas", async (req, res) => {
  try {
    if (req.user.role !== "student" && req.user.role !== "teacher") {
      return res
        .status(403)
        .json({
          error: "Access denied. Only students or teachers can view lessons.",
        });
    }

    const lessons = await prisma.lesson.findMany({
      select: {
        id: true,
        title: true,
      },
    });

    res.status(200).json(lessons);
  } catch (err) {
    console.error("Error fetching lessons:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// Rota para buscar arquivos de uma aula específica
router.get("/aulas/:id/files", async (req, res) => {
  try {
    const { id } = req.params;

    const files = await prisma.file.findMany({
      where: { lessonId: id },
      select: {
        id: true,
        title: true,
        filePath: true,
      },
    });

    if (files.length === 0) {
      return res.status(404).json({ error: "No files found for this lesson" });
    }

    res.status(200).json(files);
  } catch (err) {
    console.error("Error fetching files for lesson:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// Rota para download de um arquivo específico
router.get("/files/:id/download", async (req, res) => {
  try {
    const { id } = req.params;

    const file = await prisma.file.findUnique({
      where: { id: id },
      select: { filePath: true, title: true },
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(file.filePath, file.title);
  } catch (err) {
    console.error("Error downloading file:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

export default router;
