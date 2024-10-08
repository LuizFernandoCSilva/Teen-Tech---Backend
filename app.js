import express from 'express';
import publicRoutes from './routes/public.js';
import privateRoutes from './routes/private.js';
import authMiddleware from './middlewares/auth.js';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

app.use('/', publicRoutes);
app.use('/',authMiddleware, privateRoutes);

app.listen(3000,() =>{
  console.log('Server is running on port 3000');
})

