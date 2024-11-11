import express from 'express';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  await fs.promises.readFile(
    new URL('./cmpt276-d42a2-firebase-adminsdk-in6tp-dfad1f7266.json', import.meta.url)
  )
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cmpt276-d42a2-default-rtdb.firebaseio.com", // Update to your Firebase database URL
});

// Serve static files from the client/public directory
app.use(express.static(path.join(process.cwd(), '../client/public')));

// Middleware to verify Firebase token
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(403).send('Forbidden');
  }
};

// Define routes
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), '../client/public/html/login.html'));
});

app.get('/protected', authenticate, (req, res) => {
  res.send('This is a protected route accessible only to authenticated users.');
});
app.get('/semester.html', (req,res)=>{
  res.sendFile(path.join(process.cwd(),'../client/public/html/semester.html'));
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
