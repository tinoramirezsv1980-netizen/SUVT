import multer from 'multer';
import path from 'path';

// Un solo origen para el límite: nginx (lb) debe quedar igual o por encima.
const maxMb = Number(process.env.MAX_UPLOAD_MB ?? 5);

const storage = multer.memoryStorage();

export const uploadMisionDoc = multer({
  storage,
  limits: {
    fileSize: maxMb * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no permitido'));
    }
  },
});
