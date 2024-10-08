import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

// Cadastro de usuário (aluno ou professor)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, registrationNumber } = req.body;

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    let userDB;
    if (role === 'student') {
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
    } else if (role === 'teacher') {
      if (!registrationNumber) {
        return res.status(400).json({ error: 'Registration number is required for teachers' });
      }

      userDB = await prisma.teacher.create({
        data: {
          name,
          email,
          password: hashPassword,
          registrationNumber
        },
        select: {
          name: true,
          email: true,
          registrationNumber: true,
        },
      });
    }

    res.status(201).json(userDB);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login de usuário
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar se o usuário é estudante
    let user = await prisma.student.findUnique({
      where: { email },
    });

    
    let role;
    if (user) {
      role = 'student';
    }// Se não for encontrado como estudante, verificar se é professor
     else {
      user = await prisma.teacher.findUnique({
        where: { email },
      });
      if (user) {
        role = 'teacher';
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password or email' });
    }

    const token = jwt.sign(
      { id: user.id, role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
