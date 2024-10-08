import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// Middleware para upload de arquivos usando multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');

    // Cria a pasta caso não exista
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir); // Define a pasta onde os arquivos serão armazenados
  },
  filename: (req, file, cb) => {
    // Validação do tipo de arquivo
    if (!file.originalname.match(/\.(ipynb)$/)) { // Aceitando apenas arquivos .ipynb
      return cb(new Error('Only IPYNB files are allowed'));
    }
    cb(null, `${Date.now()}-${file.originalname}`); // Nome do arquivo único
  }
});

const upload = multer({ storage });

// Rota para upload de arquivo .ipynb (somente para professores)
router.post('/upload', upload.single('ipynbFile'), async (req, res) => {
  console.log('Arquivo recebido:', req.file); 
  console.log('Dados do corpo:', req.body); 

  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied. Only teachers can upload files.' });
    }

    const { title, lessonId, newLessonTitle } = req.body; // Obter o ID da aula ou o novo título da aula
    const filePath = req.file.path;

    // Verificação dos campos necessários
    if (!title || !filePath) {
      return res.status(400).json({ error: 'Título ou caminho do arquivo ausente.' });
    }

    let lessonIdToUse = lessonId;

    // Se um novo título de aula for fornecido, cria uma nova aula
    if (newLessonTitle) {
      // Apenas cria uma nova lição sem o filePath
      const newLesson = await prisma.lesson.create({
        data: {
          title: newLessonTitle,
        },
      });
      lessonIdToUse = newLesson.id; // Usa o ID da nova aula
    }

    // Armazenar informações do arquivo no banco de dados
    const file = await prisma.file.create({
      data: {
        title,
        filePath,
        lessonId: lessonIdToUse, // Relacionar o arquivo à aula
      },
    });

    res.status(201).json({ message: 'File uploaded successfully', file });
  } catch (err) {
    console.error('Erro ao fazer upload do arquivo:', err); // Log detalhado do erro
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Rota para listar os arquivos .ipynb disponíveis para os estudantes
router.get('/aulas', async (req, res) => {
  try {
    // Verifica se o usuário é estudante ou professor
    if (req.user.role !== 'student' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied. Only students or teachers can view lessons.' });
    }

    // Buscar todas as aulas no banco de dados
    const lessons = await prisma.lesson.findMany({
      select: {
        id: true,
        title: true,
      }
    });

    // Retorna a lista de aulas
    res.status(200).json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Rota para buscar arquivos de uma aula específica
router.get('/aulas/:id/files', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar os arquivos relacionados à aula
    const files = await prisma.file.findMany({
      where: { lessonId: id },
      select: {
        id: true,
        title: true,
        filePath: true,
      }
    });

    res.status(200).json(files);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Rota para download de um arquivo específico
router.get('/files/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar o arquivo pelo ID
    const file = await prisma.file.findUnique({
      where: { id: id },
      select: { filePath: true, title: true },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(file.filePath, file.title); // Inicia o download
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

export default router;
