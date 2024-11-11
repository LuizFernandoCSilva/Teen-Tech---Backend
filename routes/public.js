import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("JWT secret is missing");
  process.exit(1);
}

// Cadastro de usuário
// Cadastro de usuário (aluno ou professor)
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role, registrationNumber } = req.body;

<<<<<<< HEAD
    // Validação do número de matrícula para professores
    const numberMatriculation = [
      "2022010384",
      "2022003933",
      "2022002551",
      "2022013072",
      "2022003915",
      "2022002186",
      "2022003307",
      "2022003334",
    ];

    if (
      role === "teacher" &&
      !numberMatriculation.includes(registrationNumber)
    ) {
      return res.status(400).json({ error: "Invalid registration number" });
=======
    const numberMatriculation = ['2022010384','2022003933','2022002551','2022013072','2022003915','2022002186','2022003307','2022003334']
    if (role === 'teacher' && !numberMatriculation.includes(registrationNumber)) {
      return res.status(400).json({ error: 'Invalid registration number' });
    }
    
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
>>>>>>> 6cfc49e27ac747482296a03866c54a1cc9ed102d
    }

    if (!["student", "teacher"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Verificar se o e-mail p/ estudante  já existe
    const existingStudant = await prisma.student.findUnique({
      where: { email },
    });

    if (existingStudant) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Caso seja um professor, verificar se o e-mail já existe na tabela de professores
    if (role === "teacher") {
      const existingTeacher = await prisma.teacher.findUnique({
        where: { email },
      });

      if (existingTeacher) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Gerar hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    let userDB;
    if (role === "student") {
      userDB = await prisma.student.create({
        data: {
          name,
          email,
          password: hashPassword,
        },
        select: {
          name: true,
          email: true,
        },
      });
    } else if (role === "teacher") {
      if (!registrationNumber) {
        return res
          .status(400)
          .json({ error: "Registration number is required for teachers" });
      }

      userDB = await prisma.teacher.create({
        data: {
          name,
          email,
          password: hashPassword,
          registrationNumber,
        },
        select: {
          name: true,
          email: true,
          registrationNumber: true,
        },
      });
    }

    // Retorna o usuário criado com status 201
    res.status(201).json(userDB);
  } catch (err) {
    // Tratamento de erro caso o código de erro seja P2002 (erro de restrição única do Prisma)
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already in use" });
    }
    next(err); // Passa o erro para o manipulador global de erros
  }
});

// Login de usuário
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await prisma.student.findUnique({
      where: { email },
    });

    let role;
    if (user) {
      role = "student";
    } else {
      user = await prisma.teacher.findUnique({
        where: { email },
      });
      if (user) {
        role = "teacher";
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password or email" });
    }

    const token = jwt.sign({ id: user.id, role }, JWT_SECRET, {
      expiresIn: "2h",
    });

    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
