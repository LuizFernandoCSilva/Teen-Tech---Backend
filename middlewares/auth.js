import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try{
    const decoded = jwt.verify(token.replace('Bearer ',''), JWT_SECRET);
    req.user = decoded;
    next();

  }catch(err){
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default authMiddleware;

